var sock = require('../')
var server = new sock.server(8080)


server.on('msg', function(client, msg) {
	// send it to all other connected nodes
	client.send('ok got it')
})
