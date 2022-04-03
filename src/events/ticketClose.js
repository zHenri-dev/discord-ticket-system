const { MessageEmbed } = require("discord.js");

module.exports = class {
    constructor(client) {
        this.client = client;
        this.eventName = "interactionCreate";
    }

    async run(interaction) {
        try {
            if (interaction.customId.startsWith("close-") && interaction.customId.replace("close-", "") == interaction.message.channelId) {
                interaction.deferUpdate();
                let closingEmbed = new MessageEmbed()
                    .setAuthor({ name: `${interaction.user.username} solicitou o encerramento deste canal de suporte!`, iconURL: `https://i.imgur.com/kLw1M7i.png` })
                    .setDescription(`Esta ação não pode ser revertida, estamos encerrando este canal de atendimento e o membro receberá um cooldown para a criação de novos canais de suporte.`)
                interaction.message.channel.send({ embeds: [closingEmbed] }).catch(() => { });
                setTimeout(async () => {
                    let ticket = await this.client.database.tickets.findOne({ channelId: interaction.message.channelId, closed: false });
                    interaction.message.channel.delete().catch(() => { });
                    if (ticket) {
                        ticket.closed = true;
                        ticket.save();
                        let user = await this.client.users.cache.get(ticket.userId);
                        let tag = "Desconhecido";
                        if (user) {
                            tag = user.tag;
                            let closedEmbed = new MessageEmbed()
                                .setAuthor({ name: `${interaction.user.username} encerrou o seu canal de atendimento!`, iconURL: interaction.user.displayAvatarURL() })
                                .setDescription("Um atendente acabou de encerrar seu atendimento, agora espere o fim do tempo de espera para criar outro canal de suporte.")
                                .setFooter({ text: "Caso tente enviar uma mensagem e seu tempo de espera ainda esteja ativo, será informado o quanto ainda e necessário esperar!" })
                                .setTimestamp();
                            user.send({ embeds: [closedEmbed] }).catch(() => { });
                            this.client.database.cooldowns.create({
                                userId: user.id,
                                time: new Date().getTime() + this.client.ticketConfig.cooldownAfterClose // 3 hours
                            });
                        }
                        await this.client.database.histories.create({
                            string: `**${interaction.user.tag}** encerrou o canal de **${tag}**.`,
                            createdAt: new Date().getTime(),
                        });
                    }
                    this.client.functions.updateMessages();
                }, 7000);
            }
        } catch (error) {
            if (error) console.error(error);
        }
    }
};