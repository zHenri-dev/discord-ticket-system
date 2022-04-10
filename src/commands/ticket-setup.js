const { MessageEmbed } = require("discord.js");

module.exports = class TitcketSetup {
    constructor(client) {
        this.client = client;
        this.name = "ticket-setup";
        this.aliases = [];
    }

    async run({ message, args }) {
        try {
            if (message.guild && message.guild.id != this.client.ticketConfig.mainGuildId) {
                message.reply(`Este comando apenas pode ser executado no discord principal.`).then(msg => setTimeout(() => { message.delete().catch(() => { }); msg.delete().catch(() => { }); }, 15000)).catch(() => { });
                return;
            }
            if (!message.member.permissions.has("ADMINISTRATOR")) {
                message.reply(`Você não possui permissão para executar este comando.`).then(msg => setTimeout(() => { message.delete().catch(() => { }); msg.delete().catch(() => { }); }, 15000)).catch(() => { });
                return;
            }
            let ticketCount = (await this.client.database.tickets.find({ closed: false })).length;
            let embed = new MessageEmbed()
                .setAuthor({ name: "Área de atendimento ao jogador.", iconURL: "https://i.imgur.com/UOYVtyT.png" })
                .setDescription(`Clique no emoji abaixo para ser redirecionado a criação de seu ticket, o atendimento será realizado por meio de suas mensagens privadas.\n\n⠀ **Histórico:**${await this.client.functions.getGlobalHistory()}\n\n⠀ **Informações:**\n${this.client.customEmojis.gunpowder} Estamos com ${ticketCount} canais de suporte abertos.\n${this.client.customEmojis.connection} Latência: ~${this.client.ws.ping}ms.`)
                .setFooter({ text: "Clique nesta reação abaixo para criar um canal de suporte, converse conosco através de suas mensagens privadas! Lembre-se de deixar sua DM aberta." })
            let msg = await message.channel.send({ embeds: [embed] }).catch(() => { });
            msg.react(`${this.client.customEmojis.mailbox}`).catch(() => { });
            this.client.database.messages.create({
                guildId: msg.guild.id,
                channelId: msg.channel.id,
                messageId: msg.id,
            });
            message.delete().catch(() => { });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Commands] Ocorreu um erro ao executar o comando ${this.name}.js\x1b[0m`)
        }
    }
};