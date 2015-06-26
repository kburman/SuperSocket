'use strict';
/*
	Module Dependencies
*/
var net = require('net')
var q 	= require('q')
var util = require('util')
var EventEmitter = require('events').EventEmitter
var EOD = '\n'	// marks end of data


/*
	It is a Wrapper for socket to provide reliable connection
	even if its disconnect it will try to reconnect it 
*/

function Socket (port, host, option) {
	// prevention is better than cure
	if (port == undefined) {
		throw new Error('port can\'t be undefined')
	}

	option = option || {}
	this._port = port
	this._host = host
	this.connectDelay = option.connectDelay || 100
	EventEmitter.call(this)

	// some state variables
	this.connected = false	// true is connection is established
	this.connecting = false // to prevent multiple connect attempts
	this._rawSocket = undefined
	this._destroying = false

	// now try to connect to server
	this.connect()
}

// inherit the event emitter
util.inherits(Socket, EventEmitter)

/*
	It will try to connect and if there is any previous 
	connection established then it will be destroyed

	Note: this method can be easily misused so do
	check for connecting variable before calling this
*/

Socket.prototype._connect = function() {
	// if we are about be destroyed then don't try
	// to connect because it will be of no use
	if (this._destroying) return;

	var self = this

	// notify that connection will be terminated
	// sending error for stack trace
	if (this.connected) {
		this.emit('disconnected', new Error())
	}

	// change the state variables
	this.connected = false
	this.connecting = true

	// destroy any previous connection
	if (this._rawSocket != undefined) {
		this._rawSocket.destroy()
	}

	// now try to connect and if fail
	// restart the whole process
	this._tryConnect()
		.then(function connected () {
			// change the state variables
			self.connecting = false
			self.connected = true

			// now we need to hookup for any future error
			self._rawSocket.on('error', self._connect.bind(self))
			self._rawSocket.on('end', self._connect.bind(self))
			// and data need to piped to self
			self._rawSocket.on('data', function (chunk) { self.emit('data', chunk); })

			// notify that we are now connected
			self.emit('connected')
		})
		.catch(function connectError (err) {
			// wait for some time and retry
			q.delay(self.connectDelay)
				.then(self._connect.bind(self))
		})
}

/*
	This method return a promise that it
	will try to connect
*/

Socket.prototype._tryConnect = function() {
	var defer = q.defer()
	var self = this
	var obj = {
		port: this._port,
		host: this._host
	}

	// to handle any error occured during connecting
	function _handleConnectError (err) {
		// we can't complete out promise
		// so reject it
		defer.reject(err)
	}

	this._rawSocket = net.connect(obj, function () {
		// hurray we are now connected 
		// now we don't need look for connect errors
		self._rawSocket.removeListener('error', _handleConnectError)
		// change the state variables
		self.connecting = false
		self.connected = true

		// we completed out promise
		// now resolve it
		defer.resolve()
	})

	// hookup for any error during connect
	this._rawSocket.once('error', _handleConnectError)

	// return a promise that we will do
	return defer.promise	
}

/*
	This method provide the sheild to _connect method from 
	being misused
*/

Socket.prototype.connect = function() {
	// if its not connected and not even trying to connect
	// then call _connect method
	if (!this.connected && !this.connecting) {
		this._connect()
	}
}

/*
	Close any established connection 
*/
Socket.prototype.destroy = function() {
	if (this.connected) {
		this._rawSocket.destroy()
	}
	this.connected = false
	this.connecting = false
	this.emit('closed')
}


/*
	Push back data to stream
*/


Socket.prototype.unshift = function(chunk) {
	if (this._rawSocket != undefined && this.connected) {
		this._rawSocket.unshift(chunk)
	} else {
		throw new Error('Trying to unshift data but socket is not in valid state')
	}
}

/*
	return underlying socket object
*/
Socket.prototype.getSocket = function() {
	return this._rawSocket
}














/*
	InSort:	It will read from socket for msg and write msg to socket

	It can be as an abstract layer to write and read
	msg without converting it to buffer

	It will in future can compress and encrypt data
	to be send.
*/

function parser (socket, option) {
	if (socket == undefined) {
		throw new Error('Socket cant be undefined')
	}

	// make room to work
	this._buffer = []
	this._socket = socket
	this._option = option
	this._translator = new translator()

	EventEmitter.call(this)

	// hookup for updates
	// when ever we got connection clear the buffer
	// it can be possible that connection was restablished
	// and we might have some data in buffer from old
	// connection
	socket.on('connected', this._newConnection.bind(this))
	socket.on('data', this._handleData.bind(this))
} 

// inherit the event emitter
util.inherits(parser, EventEmitter)


/*
	If it is called there can be two case we connected to 
	server for first time or previous connection was not working
	so new connection was established
	in both cases we have to 
*/ 
parser.prototype._newConnection = function() {
	// clear buffer
	this._buffer = []
}

/*
	it is called when socket recveived some data
	for internal use
*/

parser.prototype._handleData = function(chunk) {
	var str = chunk.toString()
	if (str.indexOf(EOD) > 0) {
		// so we got our header
		var split = str.split(EOD)
		this._buffer.push(new Buffer(split.shift()))
		var header = Buffer.concat(this._buffer)
		header = this._translator.decode(header)

		// now we completed our header return what we don't need
		var remaining = split.join(EOD)
		var buf = new Buffer(remaining)
		if (buf.length) {
			this._socket.unshift(buf)
		}

		// now clear the buffer
		this._buffer = []
		
		// now announce that i got header
		this.emit('msg', header)
	} else {
		// we have to wait a little more
		// for now just add it to buffer
		this._buffer.push(chunk)
	}
}

/*
	Simple purpose :  msg > translator > socket
*/

parser.prototype.write = function(msg) {
	if (this._socket.connected) {
		this._socket.getSocket().write(this._translator.encode(msg) + EOD)
	} else {
		throw new Error('Socket is not connected')
	}
}








/*
	It knows how encode and decode the data
	provided all information eg. encryption key
*/

function translator (option) {
	// right now we don't anything special to
	// do here but will add encryption and gzip 
	// so wait
}

/*
	Should return Buffer
*/
translator.prototype.encode = function(msg) {
	return new Buffer(JSON.stringify(msg))
}


/*
	Should accept buffer and return msg
*/
translator.prototype.decode = function(raw_data) {
	if (!(raw_data instanceof Buffer)) {
		throw new Error('Only accepts Buffer object')
	}
	return JSON.parse(raw_data.toString())
}














/*
	This is the class we all are were waiting for
	it combine the socket and parser to provide 
	simple interface to work
*/
function client (port, host, option) {
	// prevention is better than cure
	if (port == undefined) {
		throw new Error('port can\'t be undefined')
	}

	// make space for our variables
	this._host = host
	this._port = port
	this._option = option
	this._msgBuffer = []

	EventEmitter.call(this)

	// get helper class
	this._socket = new Socket(port, host, option)
	this._parser = new parser(this._socket)
	this._parser.on('msg', this._handleMsg.bind(this))
	this._socket.on('connected', this._onconnect.bind(this))
	this._socket.on('disconnected', this._ondisconnect.bind(this))
}

// inherit the event emitter
util.inherits(client, EventEmitter)


client.prototype._onconnect = function() {
	// hurray we are connected now check 
	// buffer if we have some pending msg
	// then send them now
	
	var itm
	while((itm = this._msgBuffer.pop()) != undefined)
	{
		this._parser.write(itm)
	}
}

client.prototype._ondisconnect = function() {
	
}


client.prototype.send = function(msg) {
	// check if we are connected if not
	// add it to buffer
	if (this._socket.connected) {
		this._parser.write(msg)
	} else {
		this._msgBuffer.push(msg)
	}
}

client.prototype._handleMsg = function(msg) {
	this.emit('msg', msg)
}






module.exports = {
	Socket: Socket,
	parser: parser,
	translator: translator,
	client: client
}
