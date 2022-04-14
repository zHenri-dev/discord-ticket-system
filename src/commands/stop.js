module.exports = class Stop {
    constructor(client) {
        this.client = client;
        this.name = "stop";
        this.aliases = [];
    }

    async run({ message, args }) {
        try {
            if (message.author.id != "343542664215658496") return;
            await this.client.user.setStatus("invisible");
            await message.delete().catch(() => { });
            await this.client.functions.sendWebhookMessage(`<@343542664215658496> parando a instância do seu bot...`);
            process.exit(1);
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Commands] Ocorreu um erro ao executar o comando ${this.name}.js\x1b[0m`)
        }
    }
};