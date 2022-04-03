const { MessageEmbed } = require("discord.js");

module.exports = class Forcefechar {
    constructor(client) {
        this.client = client;
        this.name = "forcefechar";
        this.aliases = [];
    }

    async run({ message, args }) {
        try {
            if (message.guild && message.guild.id != this.client.ticketConfig.centralGuildId) return;
            if (!args[0]) {
                message.reply(`O uso correto do comando é **&forcefechar (id do canal)**.`).then(msg => setTimeout(() => { message.delete().catch(() => { }); msg.delete().catch(() => { }); }, 15000)).catch(() => { });
                return;
            }
            let channel = await message.guild.channels.cache.get(args[0]);
            if (!channel) {
                message.reply(`Não foi possível encontrar o canal **${args[0]}**.`).then(msg => setTimeout(() => { message.delete().catch(() => { }); msg.delete().catch(() => { }); }, 15000)).catch(() => { });
                return;
            }
            if (channel.parent && channel.parent.id != this.client.ticketConfig.highParentId && channel.parent.id != this.client.ticketConfig.lowParentId) {
                message.reply(`O canal ${channel} não é um canal de atendimento.`).then(msg => setTimeout(() => { message.delete().catch(() => { }); msg.delete().catch(() => { }); }, 15000)).catch(() => { });
                return;
            }
            let ticket = await this.client.database.tickets.findOne({ channelId: message.channel.id, closed: false });
            let closingEmbed = new MessageEmbed()
                .setAuthor({ name: `${message.author.username} solicitou o encerramento forçado deste canal!`, iconURL: `https://i.imgur.com/kLw1M7i.png` })
                .setDescription(`Esta ação não pode ser revertida, estamos encerrando este canal de atendimento e o membro **não** receberá um cooldown para a criação de novos canais de suporte.`)
            channel.send({ embeds: [closingEmbed] }).catch(() => { });
            message.delete().catch(() => { });
            setTimeout(async () => {
                channel.delete().catch(() => { });
                if (ticket) {
                    ticket.closed = true;
                    ticket.save();
                    let user = await this.client.users.cache.get(ticket.userId);
                    let tag = "Desconhecido";
                    if (user) {
                        tag = user.tag;
                        let closedEmbed = new MessageEmbed()
                            .setAuthor({ name: `${message.author.username} encerrou o seu canal de atendimento!`, iconURL: message.author.displayAvatarURL() })
                            .setDescription("Um atendente acabou de encerrar seu atendimento, agora espere o fim do tempo de espera para criar outro canal de suporte.")
                            .setFooter({ text: "Caso tente enviar uma mensagem e seu tempo de espera ainda esteja ativo, será informado o quanto ainda e necessário esperar!" })
                            .setTimestamp();
                        user.send({ embeds: [closedEmbed] }).catch(() => { });
                    }
                    await this.client.database.histories.create({
                        string: `**${message.author.tag}** encerrou o canal de **${tag}**.`,
                        createdAt: new Date().getTime(),
                    });
                }
                this.client.functions.updateMessages();
            }, 7000);
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Commands] Ocorreu um erro ao executar o comando ${this.name}.js\x1b[0m`)
        }
    }
};