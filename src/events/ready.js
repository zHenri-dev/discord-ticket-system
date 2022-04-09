module.exports = class {
    constructor(client) {
        this.client = client;
        this.eventName = "ready";
    }

    async run() {
        this.client.user.setActivity(`Desenvolvido por zHenri_`);
        this.client.functions.checkMessages();
        this.client.functions.checkTickets();
        this.client.functions.updateMessages();
        this.client.functions.checkCooldowns();
        let finishedAt = performance.now();
        let time = (parseFloat(finishedAt - this.client.startedAt).toFixed(2)).replace(".00", "");
        console.log(`\x1b[38;5;75m[${this.client.user.username}] Conexão com o Discord efetuada em ${time}ms\x1b[0m`);
    }
};