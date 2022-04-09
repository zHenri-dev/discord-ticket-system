const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const moment = require("moment");
moment.locale("pt-br");

module.exports = class Profile {
    constructor(client) {
        this.client = client;
        this.name = "profile";
        this.aliases = ["perfil"];
    }

    async run({ message, args }) {
        try {
            if (message.guild && message.guild.id != this.client.ticketConfig.centralGuildId) return;
            let user = await this.client.database.users.findOne({ userId: message.author.id });
            if (!user) {
                user = await this.client.database.users.create({
                    userId: message.author.id,
                    closedTickets: 0
                });
            }
            if (!user.profile) {
                let noProfileEmbed = new MessageEmbed()
                    .setAuthor({ name: `Banco de dados pessoal desativado!`, iconURL: "https://i.imgur.com/Y5YYwKg.png" })
                    .setDescription(`Necessário ter o banco de dados pessoal habilitado para fazer poder ver o perfil.`)
                    .setFooter({ text: `Clique no botão abaixo para habilitar o banco de dados pessoal, do mesmo ficarão salvos registros de alterações de menos importância ou que só envolvam você.` });
                let row = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId(`activate-profile`)
                        .setStyle("PRIMARY")
                        .setLabel("Habilitar o banco de dados pessoal."),
                );
                let noProfileMessage = await message.reply({ embeds: [noProfileEmbed], components: [row], allowedMentions: { repliedUser: false } }).catch(() => { });
                const filter = (interaction) => interaction.user.id == message.author.id;
                const collector = noProfileMessage.createMessageComponentCollector({ filter, time: 60000, max: 1 });
                collector.on("collect", async i => {
                    i.deferUpdate();
                    if (i.customId == "activate-profile") {
                        user.profile = {
                            anonymous: false,
                            mentions: true,
                            ticketInactiveTime: this.client.ticketConfig.ticketInactiveTime,
                            history: [{ string: `**${message.author.tag}** ativou o banco de dados pessoal.`, createdAt: new Date().getTime() }]
                        }
                        user.save();
                        noProfileMessage.edit({ content: `${message.author.username} precisou ativar o banco de dados pessoal.`, embeds: [], components: [] }).catch(() => { });
                        let successEmbed = new MessageEmbed()
                            .setAuthor({ name: `O seu banco de dados pessoal foi habilitado com sucesso!`, iconURL: "https://i.imgur.com/Y5YYwKg.png" })
                            .setDescription(`A alteração realizada foi salva no seu banco de dados pessoal, e está disponível para\nvocê em quaisquer momento que solicitar o resumo das atividades.`);
                        noProfileMessage.reply({ embeds: [successEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                    }
                });
                return;
            }
            let historyString = await this.client.functions.getProfileHistory(user.profile.history);
            let profileEmbed = new MessageEmbed()
                .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setDescription(`A seguir estão algumas informações e alterações que podem ser realizadas,\nalgumas podendo pedir confirmação dependendo do seu grau de importância.\n⠀\n⠀${this.client.customEmojis.conveyor} **Histórico de alterações:**${historyString}\n⠀\n⠀ ${this.client.customEmojis.settings} **Configurações:**\nEntre cochetes tem um ID que você pode enviar neste canal para alterar a\nconfiguração correspondente. Configurações secundárias também são alteradas!\n\n${user.profile.anonymous ? this.client.customEmojis.on : this.client.customEmojis.off} | \`[01]\` Modo anônimo.\n${user.profile.mentions ? this.client.customEmojis.on : this.client.customEmojis.off} | \`[02]\` Recebimento de notificações.\n⠀↳ Tempo inativo atual: ${user.profile.ticketInactiveTime / 60 / 1000} minutos\n⠀`)
                .setFooter({ text: "Algumas alterações realizadas neste painel podem interferir diretamente na relação entre você e a central de suporte, entretanto podem ser revertidas a quaisquer momento.", iconURL: "https://i.imgur.com/j2gkJ7c.png" });
            let profileMessage = await message.reply({ embeds: [profileEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
            const filter = m => m.author.id == message.author.id;
            const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });
            collector.on("collect", m => {
                if (!m.content) return;
                switch (m.content.toLowerCase()) {
                    case "01":
                    case "1":
                    case "[01]":
                        m.delete().catch(() => { });
                        let anonymousEmbed = new MessageEmbed()
                            .setDescription(`Confirme nas opções abaixo se você deseja ${user.profile.anonymous ? "desativar" : "ativar"} o modo anônimo da sua conta.`)
                            .setFooter({ text: "Essa opção interfere apenas no contato entre você e o membro que você está atendendo, o mesmo não saberá com quem ele está falando.", iconURL: "https://i.imgur.com/j2gkJ7c.png" });
                        profileMessage.edit({ content: `**${message.author.username}** você está mexendo na configurações do modo anônimo.`, embeds: [anonymousEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                        profileMessage.react(this.client.customEmojis.confirm).catch(() => { });
                        const anonymousFilter = (reaction, user) => reaction.emoji.name === "confirm" && user.id == message.author.id;
                        const anonymousCollector = profileMessage.createReactionCollector({ filter: anonymousFilter, time: 60000, max: 1 });
                        anonymousCollector.on("collect", () => {
                            user.profile = {
                                ...user.profile,
                                anonymous: !user.profile.anonymous,
                                history: [...user.profile.history, { string: `**${message.author.tag}** ${!user.profile.anonymous ? "ativou" : "desativou"} o modo anônimo.`, createdAt: new Date().getTime() }]
                            }
                            user.save();
                            let successAnonymousEmbed = new MessageEmbed()
                                .setDescription(`Configuração de modo anônimo alteradas para: **${user.profile.anonymous ? "Ativado(a)" : "Desativado(a)."}**`)
                                .setFooter({ text: "Caso queira reverter esta configuração que acabou de ser aplicada, basta usar o comando novamente e seguir o mesmo procedimento.", iconURL: "https://i.imgur.com/j2gkJ7c.png" });
                            profileMessage.edit({ embeds: [successAnonymousEmbed] }).catch(() => { });
                            profileMessage.reactions.removeAll().catch(() => { });
                        });
                        break;
                    case "02":
                    case "2":
                    case "[02]":
                        m.delete().catch(() => { });
                        let mentionEmbed = new MessageEmbed()
                            .setDescription(`Confirme nas opções abaixo se você deseja desativar as notificações da sua conta.\n${user.profile.mentions ? `**Use ${this.client.customEmojis.settings} para editar configuração secundária desta opção.**` : `**${this.client.customEmojis.settings} As notificações de sua conta estão desativadas, por conta disso as\nconfigurações secundárias ficam indisponíveis.**`}`)
                            .setFooter({ text: "Quando um membro enviar uma mensagem para a central de suporte no canal em que a última mensagem seja sua, após ficar inativo por este tempo você será mencionado.", iconURL: "https://i.imgur.com/j2gkJ7c.png" });
                        profileMessage.edit({ content: `**${message.author.username}** você está mexendo nas configurações das notificações.`, embeds: [mentionEmbed], allowedMentions: { repliedUser: false } }).catch(() => { })
                        profileMessage.react(this.client.customEmojis.confirm).catch(() => { });
                        if (user.profile.mentions) profileMessage.react(this.client.customEmojis.settings).catch(() => { });
                        const mentionFilter = (reaction, user) => user.id == message.author.id;
                        const mentionCollector = profileMessage.createReactionCollector({ filter: mentionFilter, time: 60000, max: 1 });
                        mentionCollector.on("collect", reaction => {
                            if (reaction.emoji.name == "confirm") {
                                user.profile = {
                                    ...user.profile,
                                    mentions: !user.profile.mentions,
                                    history: [...user.profile.history, { string: `**${message.author.tag}** ${!user.profile.mentions ? "ativou" : "desativou"} o recebimento de notificações.`, createdAt: new Date().getTime() }]
                                }
                                user.save();
                                let successMentionsEmbed = new MessageEmbed()
                                    .setDescription(`Configuração de notificações alteradas para: **${user.profile.mentions ? "Ativado(a)" : "Desativado(a)."}**`)
                                    .setFooter({ text: "Caso queira reverter esta configuração que acabou de ser aplicada, basta usar o comando novamente e seguir o mesmo procedimento.", iconURL: "https://i.imgur.com/j2gkJ7c.png" });
                                profileMessage.edit({ embeds: [successMentionsEmbed] }).catch(() => { });
                                profileMessage.reactions.removeAll().catch(() => { });
                            } else if (reaction.emoji.name == "settings" && user.profile.mentions) {
                                let secondMentionEmbed = new MessageEmbed()
                                    .setDescription(`Informe em minutos o tempo inativo de ser notificado em um canal de\nsuporte. **Caso não queria receber notificações, será necessário desligar!**`)
                                    .setFooter({ text: "Esse tempo em minutos deve ser um número maior que 0. Se você colocar [5] após o ticket não receber novas mensagens por 5 minutos se você foi o último a enviar uma mensagem, será mencionado.", iconURL: "https://i.imgur.com/j2gkJ7c.png" });
                                profileMessage.edit({ content: `**${this.client.customEmojis.settings} Editando as configurações secundárias das notificações.**`, embeds: [secondMentionEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                                profileMessage.reactions.removeAll().catch(() => { });
                                const secondMentionFilter = (m) => m.author.id == message.author.id;
                                const secondCollector = profileMessage.channel.createMessageCollector({ filter: secondMentionFilter, time: 60000});
                                secondCollector.on("collect", m => {
                                    if (!m.content) return;
                                    let number = parseInt(m.content);
                                    if (number && number > 0) {
                                        user.profile = {
                                            ...user.profile,
                                            ticketInactiveTime: number * 60 * 1000,
                                            history: [...user.profile.history, { string: `**${message.author.tag}** alterou o tempo inativo de ser notificado.`, createdAt: new Date().getTime() }]
                                        }
                                        user.save();
                                        m.delete().catch(() => { });
                                        let successMentionsEmbed = new MessageEmbed()
                                            .setDescription(`O tempo inativo de você ser notficado foi alterado para: **${number} minuto(s)**`)
                                            .setFooter({ text: "Caso queira reverter esta configuração que acabou de ser aplicada, basta usar o comando novamente e seguir o mesmo procedimento informando o tempo anterior.", iconURL: "https://i.imgur.com/j2gkJ7c.png" });
                                        profileMessage.edit({embeds: [successMentionsEmbed]}).catch(() => { });
                                        secondCollector.stop();
                                    }
                                });
                            }
                        });
                        break;
                }
            });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Commands] Ocorreu um erro ao executar o comando ${this.name}.js\x1b[0m`)
        }
    }
};