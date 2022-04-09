const { MessageEmbed } = require("discord.js");
const { writeFileSync } = require("fs");
const moment = require("moment");
moment.locale("pt-br");

module.exports = class Functions {
    constructor(client) {
        this.client = client;
    }

    async checkMessages() {
        try {
            let messages = await this.client.database.messages.find({});
            messages.forEach(async message => {
                let guild = await this.client.guilds.cache.get(message.guildId);
                if (!guild) return message.delete();
                let channel = await guild.channels.cache.get(message.channelId);
                if (!channel) return message.delete();
                let discordMessage = await channel.messages.fetch(message.messageId).catch(() => { message.delete(); })
                if (!discordMessage) message.delete();
            });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Functions] Ocorreu um erro ao executar a função checkMessages \x1b[0m`);
        }
    }

    async checkTickets() {
        try {
            let tickets = await this.client.database.tickets.find({ closed: false });
            tickets.forEach(async ticket => {
                let guild = await this.client.guilds.cache.get(this.client.ticketConfig.centralGuildId);
                if (!guild) {
                    ticket.closed = true;
                    ticket.save();
                    return;
                }
                let channel = await guild.channels.cache.get(ticket.channelId);
                if (!channel) {
                    ticket.closed = true;
                    ticket.save();
                }
            });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Functions] Ocorreu um erro ao executar a função checkTickets \x1b[0m`);
        }
    }

    async checkCooldowns() {
        try {
            let cooldowns = await this.client.database.cooldowns.find({});
            cooldowns.forEach(async cooldown => {
                if (cooldown.time <= new Date().getTime()) cooldown.delete();
            });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Functions] Ocorreu um erro ao executar a função checkCooldowns \x1b[0m`);
        }
    }

    async updateMessages() {
        try {
            let messages = await this.client.database.messages.find({});
            messages.forEach(async message => {
                let guild = await this.client.guilds.cache.get(message.guildId);
                if (!guild) return;
                let channel = await guild.channels.cache.get(message.channelId);
                if (!channel) return;
                let discordMessage = await channel.messages.fetch(message.messageId).catch(() => { message.delete(); })
                if (!discordMessage);
                let ticketCount = (await this.client.database.tickets.find({ closed: false })).length;
                let updatedEmbed = new MessageEmbed()
                    .setAuthor({ name: "Área de atendimento ao jogador.", iconURL: "https://i.imgur.com/UOYVtyT.png" })
                    .setDescription(`Clique no emoji abaixo para ser redirecionado a criação de seu ticket, o atendimento\nserá realizado por meio de suas mensagens privadas.\n\n⠀ **Histórico:**${await this.client.functions.getGlobalHistory()}\n\n⠀ **Informações:**\n${this.client.customEmojis.gunpowder} Estamos com ${ticketCount} canais de suporte abertos.\n${this.client.customEmojis.connection} Latência: ~${this.client.ws.ping}ms.`)
                    .setFooter({ text: "Clique nesta reação abaixo para criar um canal de suporte, converse conosco através de suas mensagens privadas! Lembre-se de deixar sua DM aberta." })
                discordMessage.edit({ embeds: [updatedEmbed] }).catch(() => { });
            });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Functions] Ocorreu um erro ao executar a função updateMessages \x1b[0m`);
        }
    }

    async getGlobalHistory() {
        try {
            if (new Date().getDate() != this.client.config.ticketConfig.currentDay) {
                await this.client.database.histories.deleteMany({});
                this.client.config.ticketConfig.currentDay = new Date().getDate();
                writeFileSync('./src/config/config.json', JSON.stringify(this.client.config, null, 4));
            }
            let histories = await this.client.database.histories.find({});
            if (histories.length == 0) return "\n⠀Nenhuma ação feita recentemente.";
            histories.sort((a, b) => { return new Date(b.createdAt) - new Date(a.createdAt) });
            let historyString = "";
            for (let x = 0; x < this.client.ticketConfig.historyLength; x++) {
                let history = histories[x];
                if (history) historyString += `\n\`[${moment(history.createdAt).format(`DD/MM [às] HH:mm`)}]\` ${history.string}`
            }
            let remain = histories.length - this.client.ticketConfig.historyLength;
            if (remain > 0) historyString += `\n[+${remain} alterações feitas nas últimas 24 horas.](https://discord.com/channels/${this.client.ticketConfig.mainGuildId}/)`
            return historyString;
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Functions] Ocorreu um erro ao executar a função getGlobalHistory \x1b[0m`);
        }
    }

    async updateTicketHistory(ticket) {
        try {
            let central = await this.client.guilds.cache.get(this.client.ticketConfig.centralGuildId);
            if (!central) return;
            let channel = await central.channels.cache.get(ticket.channelId);
            if (!channel) return;
            let message = await channel.messages.fetch(ticket.firstMessageId).catch(() => { });
            if (!message) return;
            let user = await this.client.users.cache.get(ticket.userId);
            if (!user) return;
            ticket.history.sort((a, b) => { return new Date(b.createdAt) - new Date(a.createdAt) });
            let historyString = "";
            for (let x = 0; x < this.client.ticketConfig.historyLength; x++) {
                let history = ticket.history[x];
                if (history) historyString += `\n\`[${moment(history.createdAt).format(`DD/MM [às] HH:mm`)}]\` ${history.string.replace("%highEmoji%", this.client.customEmojis.uparrow).replace("%lowEmoji%", this.client.customEmojis.downarrow)}`
            }
            let remain = ticket.history.length - this.client.ticketConfig.historyLength;
            if (remain > 0) historyString += `\n[+${remain} alterações feitas nas últimas 24 horas.](https://discord.com/channels/${this.client.ticketConfig.centralGuildId}/)`
            let newMessageEmbed = new MessageEmbed()
                .setAuthor({ name: "Canal de atendimento.", iconURL: "https://i.imgur.com/kLw1M7i.png" })
                .setDescription(`Este canal foi criado por ${user.username} em ${moment(ticket.createdAt).format("LLL")}.\n**Categoria:** ${ticket.category}\n\n⠀ **Histórico do canal:**${historyString}\n\n⠀ **Informações:**\n${this.client.customEmojis.connection} Latência: ~${this.client.ws.ping}ms.`)
                .setFooter({ text: `ID do membro: ${user.id}  —  ID do canal: ${channel.id}` });
            message.edit({ embeds: [newMessageEmbed] }).catch(() => { });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Functions] Ocorreu um erro ao executar a função updateTicketHistory \x1b[0m`);
        }
    }

    async getFormatedTime(time) {
        try {
            time = parseInt(time);
            if (!time) return undefined;
            let formated = [];
            let days = Math.floor(time / (60 * 60 * 24 * 1000));
            if (days > 0) { time = time - (days * (60 * 60 * 24 * 1000)); if (days == 1) { formated.push(`${days} d`) } else { formated.push(`${days}ds`) }; };
            let hours = Math.floor(time / (60 * 60 * 1000));
            if (hours > 0) { time = time - (hours * (60 * 60 * 1000)); if (hours == 1) { formated.push(`${hours}hr`) } else { formated.push(`${hours}hrs`) }; };
            let minutes = Math.floor(time / (60 * 1000));
            if (minutes > 0) { time = time - (minutes * (60 * 1000)); if (minutes == 1) { formated.push(`${minutes}m`) } else { formated.push(`${minutes}m`) }; };
            let seconds = Math.floor(time / 1000);
            if (seconds > 0) { time = time - (seconds * (60 * 1000)); if (seconds == 1) { formated.push(`${seconds}s`) } else { formated.push(`${seconds}s`) }; };
            let returnString = formated.join(", ");
            if (formated.length > 1) {
                let last = formated.pop();
                returnString = formated.join(", ") + " e " + last;
            }
            return returnString;
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Functions] Ocorreu um erro ao executar a função getFormatedTime \x1b[0m`);
        }
    }

    async getUsedMemory() {
        try {
            return Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Functions] Ocorreu um erro ao executar a função getUsedMemory \x1b[0m`);
        }
    }
};