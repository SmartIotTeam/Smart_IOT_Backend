const mqtt = require("mqtt"),
    client = mqtt.connect("mqtt://broker.hivemq.com:1883");
const readline = require("readline"),
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

let userNickName = "";
const topic = "CHAT";
rl.question("Name : ", (name) => {
    userNickName = name;
    client.on("connect", (_) => console.log("Connect"));
    client.publish("CHAT_LIST_JOIN", JSON.stringify({ join: userNickName }));
    client.subscribe(topic, { qos: 1 }, (_) => console.log("subscribe!"));
    client.on("message", (topic, message) => {
        const _data = JSON.parse(message.toString());
        if (userNickName === _data.userNickName)
            console.log(`[${topic}] ${_data.userNickName} : ${_data.chat}`);
    });
});
rl.on("line", (line) =>
    client.publish(topic, JSON.stringify({ userNickName, chat: line }))
);