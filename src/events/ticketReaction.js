const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require("discord.js");

module.exports = class {
    constructor(client) {
        this.client = client;
        this.eventName = "raw";
    }

    async run(data) {
        try {
            if (data.t == "MESSAGE_REACTION_ADD") {
                let messageCheck = await this.client.database.messages.findOne({ guildId: data.d.guild_id, channelId: data.d.channel_id, messageId: data.d.message_id });
                if (messageCheck && data.d.emoji.name == this.client.ticketConfig.emojiName) {
                    let user = await this.client.users.cache.get(data.d.user_id);
                    if (!user || user.bot) return;
                    let guild = await this.client.guilds.cache.get(data.d.guild_id);
                    if (!guild) return;
                    let channel = await guild.channels.cache.get(data.d.channel_id);
                    if (!channel) return;
                    let message = await channel.messages.fetch(data.d.message_id).catch(() => { });
                    if (!message) return;
                    (await message.reactions.cache.get(this.client.ticketConfig.emojiName)).users.remove(data.d.user_id);
                    let categorySelectorEmbed = new MessageEmbed()
                        .setAuthor({ name: `${user.username}`, iconURL: user.displayAvatarURL() })
                        .setDescription(`Escolha dentre as categorias abaixo para classificar seu atendimento, é possível\npular este processo enviando uma mensagem neste canal com seu problema!`)
                    let options = [];
                    for (let category in this.client.categories) {
                        let categoryOptions = this.client.categories[category];
                        options.push({
                            label: `${categoryOptions.name}`,
                            emoji: categoryOptions.emoji,
                            value: `${category}`,
                        });
                    }
                    const row = new MessageActionRow().addComponents(
                        new MessageSelectMenu()
                            .setCustomId(`category-select`)
                            .setPlaceholder('Escolha a categoria que deseja classificar')
                            .addOptions(options)
                    );
                    let categorySelector = await user.send({ embeds: [categorySelectorEmbed], components: [row] }).catch(() => { });
                    const filter = (interaction) => interaction.user.id == data.d.user_id;
                    const collector = categorySelector.createMessageComponentCollector({ filter, time: 120000 });
                    collector.on("collect", i => {
                        i.deferUpdate();
                        let id = i.values[0];
                        if (!i.customId || i.customId != "category-select" || !id) return;
                        let category = this.client.categories[id];
                        let index = this.client.selects.findIndex(select => select.userId === i.user.id);
                        if (index === -1) {
                            this.client.selects.push({ userId: i.user.id, category: id });
                        } else {
                            let current = this.client.selects[index];
                            let newObject = { ...current, category: id };
                            this.client.selects[index] = newObject;
                        }
                        let successEmbed = new MessageEmbed()
                            .setTitle("Canal de suporte classificado com sucesso!")
                            .setDescription("⠀\nTodas as mensagens enviadas neste canal serão redirecionadas aos atendentes\nresponsáveis pela categoria que você o escolheu.")
                            .setFooter({ text: `${category.name}` })
                            .setColor(this.client.ticketConfig.selectedColor);
                        categorySelector.reply({ embeds: [successEmbed] }).catch(() => { });
                    });
                }
            }
        } catch (error) {
            if (error) console.error(error);
        }
    }
};