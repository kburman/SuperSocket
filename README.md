#sock [under devlopment] [nodejs]
=======================
Wrapper class for socket to handle reconnection on error and even buffering of messages to that it can be sent when connection is reestablished without you bothering about it.


## Example
'''
var sock = require('./sock')

var server = sock.server(8080)
server.on('msg', function(client, msg) {
	client.send('hi')
})

var client = sock.client(8080)
client.send('Hi')
'''


