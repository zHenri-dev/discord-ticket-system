const { MessageEmbed } = require("discord.js");

module.exports = class Fechar {
    constructor(client) {
        this.client = client;
        this.name = "fechar";
        this.aliases = [];
    }

    async run({ message, args }) {
        try {
            if (message.guild && message.guild.id != this.client.ticketConfig.centralGuildId) return;
            let ticket = await this.client.database.tickets.findOne({ channelId: message.channel.id, closed: false });
            if (!ticket) {
                message.reply({ content: "Este comando apenas pode ser executado dentro de um canal de atendimento!" }).then(msg => { setTimeout(() => { msg.delete().catch(() => { }); message.delete().catch(() => { }); }, 10000); }).catch(() => { });
                return;
            }
            let closingEmbed = new MessageEmbed()
                .setAuthor({ name: `Encerrando canal de suporte.`, iconURL: `https://i.imgur.com/kLw1M7i.png` })
                .setDescription(`Esta ação não pode ser revertida, estamos encerrando este canal de atendimento e o membro receberá um cooldown para a criação de novos canais de suporte.`)
            message.reply({ embeds: [closingEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
            setTimeout(async () => {
                if (message.channel) message.channel.delete().catch(() => { });
                ticket.closed = true;
                ticket.save();
                let user = await this.client.users.cache.get(ticket.userId);
                let tag = "Desconhecido";
                if (user) {
                    tag = user.tag;
                    let closedEmbed = new MessageEmbed()
                        .setAuthor({ name: `${message.author.username} encerrou seu canal de suporte.`, iconURL: message.author.displayAvatarURL() })
                        .setDescription("Um atendente acabou de encerrar seu atendimento, agora espere o fim do tempo de espera para criar outro canal de suporte.")
                        .setFooter({ text: "Caso tente enviar uma mensagem e seu tempo de espera ainda esteja ativo, será informado o quanto ainda e necessário esperar!" })
                        .setTimestamp();
                    user.send({ embeds: [closedEmbed] }).catch(() => { });
                    this.client.database.cooldowns.create({
                        userId: user.id,
                        time: new Date().getTime() + this.client.ticketConfig.cooldownAfterClose // 3 hours
                    });
                }
                let closerUser = await this.client.database.users.findOne({ userId: message.author.id });
                if (closerUser) {
                    closerUser.closedTickets++;
                    closerUser.save();
                } else {
                    closerUser = await this.client.database.users.create({
                        userId: message.author.id,
                        closedTickets: 1
                    });
                }
                await this.client.database.histories.create({
                    string: `**${message.author.tag}** encerrou o canal de **${tag}**.`,
                    createdAt: new Date().getTime(),
                });
                this.client.functions.updateMessages();
            }, 7000);
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Commands] Ocorreu um erro ao executar o comando ${this.name}.js\x1b[0m`)
        }
    }
};