const { MessageEmbed } = require("discord.js");

module.exports = class {
    constructor(client) {
        this.client = client;
        this.eventName = "interactionCreate";
    }

    async run(interaction) {
        try {
            if (interaction.customId.startsWith("close-") && interaction.customId.replace("close-", "") == interaction.message.channelId) {
                try { interaction.message.components[0].components[0].setDisabled(true); } catch { }
                interaction.message.edit({ embeds: interaction.message.embeds, components: interaction.message.components }).catch(() => { });
                let closingEmbed = new MessageEmbed()
                    .setAuthor({ name: `${interaction.user.username} solicitou o encerramento deste canal de suporte!`, iconURL: `https://i.imgur.com/kLw1M7i.png` })
                    .setDescription(`Esta ação não pode ser revertida, estamos encerrando este canal de atendimento e o membro receberá um cooldown para a criação de novos canais de suporte.`)
                interaction.reply({ embeds: [closingEmbed] }).catch(() => { });
                setTimeout(async () => {
                    let ticket = await this.client.database.tickets.findOne({ channelId: interaction.message.channelId, closed: false });
                    if (interaction.message.channel) interaction.message.channel.delete().catch(() => { });
                    if (ticket) {
                        ticket.closed = true;
                        ticket.save();
                        let user = await this.client.users.cache.get(ticket.userId);
                        let tag = "Desconhecido";
                        if (user) {
                            let userObject = await this.client.database.users.findOne({ userId: interaction.user.id });
                            let anonymous = false;
                            if (userObject && userObject.profile && userObject.anonymous) anonymous = true;
                            tag = user.tag;
                            let closedEmbed = new MessageEmbed()
                                .setAuthor({ name: `${!anonymous ? interaction.user.username : "Um membro da equipe"} encerrou seu canal de suporte.`, iconURL: `${!anonymous ? interaction.user.displayAvatarURL() : "https://i.imgur.com/cSqp77S.png"}` })
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
                    let closerUser = await this.client.database.users.findOne({ userId: interaction.user.id });
                    if (closerUser) {
                        closerUser.closedTickets++;
                        closerUser.save();
                    } else {
                        closerUser = await this.client.database.users.create({
                            userId: interaction.user.id,
                            closedTickets: 1
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