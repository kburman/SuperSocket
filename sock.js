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
	this._port = port
	this._host = host
	this.connectDelay = option.connectDelay || 100
	EventEmitter.call(this)

	// some state variables
	this.connected = false	// true is connection is established
	this.connecting = false // to prevent multiple connect attempts
	this._rawSocket = undefined

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
	var self = this

	// change the state variables
	this.connected = false
	this.connecting = true

	// destroy any previous connection
	if (this.socket != undefined) {
		// notify that connection will be terminated
		// sending error for stack trace
		this.emit('disconnected', new Error())
		this.socket.destroy()
	}

	// now try to connect and if fail
	// restart the whole process
	this._tryConnect()
		.then(function connected () {
			// change the state variables
			self.connecting = false
			self.connected = true

			// now we need to hookup for any future error
			self.socket.on('error', self._connect.bind(self))
			self.socket.on('end', self._connect.bind(self))

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
		port: this.port,
		host: this.host
	}

	// to handle any error occured during connecting
	function _handleConnectError (err) {
		// we can't complete out promise
		// so reject it
		defer.reject(err)
	}

	this.socket = net.connect(obj, function () {
		// hurray we are now connected 
		// now we don't need handle connect errors
		self.socket.removeListener('error', _handleConnectError)

		// change the state variables
		self.connecting = false
		self.connected = true

		// we completed out promise
		// now reslove it
		defer.reslove()
	})

	// hookup for any error during connect
	this.socket.once('error', _handleConnectError)

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
	

*/

function msgLooker (socket, option) {
	// body...
}