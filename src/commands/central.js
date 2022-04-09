const { MessageEmbed } = require("discord.js");

module.exports = class Central {
    constructor(client) {
        this.client = client;
        this.name = "central";
        this.aliases = [];
    }

    async run({ message, args }) {
        try {
            if (message.guild && message.guild.id != this.client.ticketConfig.centralGuildId) return;
            let centralEmbed = new MessageEmbed()
                .setAuthor({ name: `Central de Suporte — Painel.`, iconURL: "https://i.imgur.com/apgU7zm.png" })
                .setDescription(`Em seguida estão algumas configurações geral da central de surpote, além de\nconfigurações dos backups de arquivos e mensagens de canais de atendimento.\n⠀\n⠀${this.client.customEmojis.conveyor} **Histórico de alterações:**\nNenhuma alteração ou ação realizada até o momento.\n⠀\n${this.client.customEmojis.cloud}⠀**Backup's:**\nEnvie o ID que está entre colchetes para usar tal opção. Após ainda será necessário\nenviar algumas informações.\n\n${this.client.customEmojis.folder} | \`[01]\` Download do backup de um canal de suporte.\n${this.client.customEmojis.unify} | \`[02]\` Unificar backups de um canal de suporte.`)
                .setFooter({ text: "Todas as ações realizadas neste sistema são reversíveis embora possam afetar todos os usuários que tentem usar ou estejam usando a central de suporte.", iconURL: "https://i.imgur.com/j2gkJ7c.png" });
            message.reply({ embeds: [centralEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
            const filter = m => m.author.id == message.author.id;
            const collector = message.channel.createMessageCollector({filter, time: 60000, max: 1});
            collector.on("collect", m => {
                if (!m.content) return;
                switch (m.content.toLowerCase()) {
                    case "01":
                    case "1":
                    case "[01]":
                        //option 1 here
                        break;
                    case "02":
                    case "2":
                    case "[02]":
                       //option 2 here
                        break;
                } 
            });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Commands] Ocorreu um erro ao executar o comando ${this.name}.js\x1b[0m`)
        }
    }
};