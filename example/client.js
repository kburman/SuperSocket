var sock = require('../')
var client = new sock.client(8080)
client.on('msg', console.log)

client.send('Hello everyone : ' + process.pid)

setInterval(function() {
	var str = {'GOGGL: ':  parseInt(Math.random()*1000)}
	console.log(str)
	client.send(str)
}, 1000)