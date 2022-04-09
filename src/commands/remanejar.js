const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require("discord.js");
const moment = require("moment");
moment.locale("pt-br");

module.exports = class Remanejar {
    constructor(client) {
        this.client = client;
        this.name = "remanejar";
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
            let selectNewCategoryEmbed = new MessageEmbed()
                .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setDescription(`Após confirmar o remanejamento do canal, esta informação ficará vinculada no\ncanal até o seu encerramento.`)
            let row = new MessageActionRow().addComponents(
                new MessageSelectMenu()
                    .setCustomId(`remanejar-select`)
                    .setPlaceholder('Escolha a categoria que deseja remanejar.')
                    .addOptions([
                        {
                            label: "Maior complexidade.",
                            description: "Todos os superiores terão acesso.",
                            emoji: this.client.customEmojis.uparrow,
                            value: "remanejar-high"
                        },
                        {
                            label: "Menor complexidade.",
                            description: "Todos da central terão acesso ao canal.",
                            emoji: this.client.customEmojis.downarrow,
                            value: "remanejar-low"
                        },
                        {
                            label: "Encerrar.",
                            description: "O canal aparece na categoria atual.",
                            emoji: this.client.customEmojis.wastebasket,
                            value: "remanejar-close"
                        }
                    ])
            );
            let selectNewCategoryMenu = await message.channel.send({ embeds: [selectNewCategoryEmbed], components: [row] }).catch(() => { });
            const filter = (interaction) => interaction.user.id == message.author.id;
            const collector = selectNewCategoryMenu.createMessageComponentCollector({ filter, time: 60000, max: 1 });
            collector.on("collect", async i => {
                i.deferUpdate();
                if (i.customId == "remanejar-select") {
                    if (!i.values[0]) return;
                    switch (i.values[0]) {
                        case "remanejar-high":
                        case "remanejar-low":
                            i.message.channel.setParent(`${i.values[0] == "remanejar-high" ? this.client.ticketConfig.highParentId : this.client.ticketConfig.lowParentId}`);
                            ticket.history.push({ string: `**${message.author.tag}** remanejou este canal de suporte. [${i.values[0] == "remanejar-high" ? "%highEmoji%" : "%lowEmoji%"}]`, createdAt: new Date().getTime() });
                            ticket.save();
                            this.client.functions.updateTicketHistory(ticket);
                            let successEmbed = new MessageEmbed()
                                .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                                .setDescription(`Mais informações sobre este remanejamento estão fixadas na primeira mensagem\ndo canal. O histórico do canal de suporte não pode ser alterado!`);
                            let successMessage = await message.reply({ embeds: [successEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                            setTimeout(() => {
                                successMessage.delete().catch(() => { });
                                selectNewCategoryMenu.delete().catch(() => { });
                                message.delete().catch(() => { });
                            }, 5000);
                            break;
                        case "remanejar-close":
                            i.message.delete().catch(() => { });
                            message.delete().catch(() => { });
                            break;
                    }
                }
            });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Commands] Ocorreu um erro ao executar o comando ${this.name}.js\x1b[0m`)
        }
    }
};