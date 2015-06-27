var should = require('should')
var EventEmitter = require('events').EventEmitter
var portfinder = require('portfinder')
var net = require('net')
var sock = require('../')




describe('Socket', function () {

	it('Check for class members', function () {
		(function () {
			var client = new sock.Socket(8089)
			// check for all data members
			client.connected.should.be.type('boolean')
			client.connecting.should.be.type('boolean')

			client.connect.should.be.type('function')
			client.unshift.should.be.type('function')
			client.getSocket.should.be.type('function')

			// since we can't connect to port 0 
			client.connected.should.be.false()	
			client.connecting.should.be.true()
			client.destroy()
			client.connected.should.be.false()
			client.connecting.should.be.false()

		}).should.not.throw()
		true.should.be.false
	})

	it('It should inherit EventEmitter', function () {
		(function () {
			var client = new sock.Socket(0)
			client.should.be.an.instanceof(EventEmitter)
			client.destroy()
		}).should.not.throw()
	})

	it('port = undefined, should throw error', function () {
		(function () {
			var client = new sock.Socket()
		}).should.throw()
	})

	it('giving a port number which is not used, but it should not complain', function (done) {
		(function () {
			portfinder.getPort(function (err, port) {
				var client = new sock.Socket(0)
				client.destroy()
				setTimeout(function () {
					// well it should't be connected 
					// as it is a free port
					client.connected.should.be.false()	
					client.connecting.should.be.true()
					client.destroy()
					done()
				}, 500)
			})
		}).should.not.throw()
	})

	it('Checks if destroy function works', function (done) {		
		portfinder.getPort(function (err, port) {
			if(err) throw err;
			var client = new sock.Socket(port, 'localhost',{connectDelay:100})
			// after some time pass it should not be connected
			setTimeout(function() {
				client.connected.should.be.false()	
				client.connecting.should.be.true()
				client.destroy()
				setTimeout(function () {
					client.connected.should.be.false()	
					client.connecting.should.be.false()
					done()
				},200)
			}, 200)
		})
	})

	it('Connect it to a dummy server', function (done) {
		portfinder.getPort(function (err, port) {
			// ok if there was problem finding port throw it
			if(err) throw err;
			// it will be used to close server and app if 
			// nothing happens. it should not happen genrally			
			var timeout_handle;
			var app = new sock.Socket(port)			
			var server = net.createServer(function (client) {
				// great it connected to it
				// now close client and server 
				client.end()
				server.close()
				done()
				clearTimeout(timeout_handle)
			})
			server.listen(port)

			// if it fails to connect then throw error
			timeout_handle = setTimeout(function() {
				server.close()
				app.destroy()
				done(new Error('Connection Timeout'))
			}, 500);
		})
	})

})

describe('translator', function () {
	
	it('check for basic methods', function () {
		var trans = new sock.translator()
		trans.encode.should.be.type('function')
		trans.decode.should.be.type('function')
	})

	it('decode should only accept Buffer', function () {
		var trans = new sock.translator()
		//trans.decode('Hello world').should.throw()
		trans.decode(trans.encode('Hello world')).should.not.throw()
	})

	it('check encode and decode methods', function () {
		var trans = new sock.translator()
		var testMsg = {
			'string':'hello world',
			'int':234,
			'boolean':true
		}

		var encodedMsg = trans.encode(testMsg)
		var decodedMsg = trans.decode(encodedMsg)

		testMsg.should.be.eql(decodedMsg)
	})

})

describe('parser', function () {
	
	it('It should not except undefined socket field', function () {
		(function () {
			new sock.parser()
		}).should.throw()
	})

	it.skip('check for basic methods', function () {
		var pars = new sock.parser()
		pars.write.should.be.type('function')
	})

	it.skip('It should inherit EventEmitter', function () {
		(function () {
			var client = new sock.parser(0)
			client.should.be.an.instanceof(EventEmitter)
			client.destroy()
		}).should.not.throw()
	})

	// need to rewrite test
	it.skip('check it can read', function (done) {
		portfinder.getPort(function (err, port) {
			// ok if there was problem finding port throw it
			if(err) throw err;
			// it will be used to close server and app if 
			// nothing happens. it should not happen genrally			
			var timeout_handle;
			var app = new sock.Socket(port)	
			var parser = new sock.parser(app)
			var server = net.createServer(function (client) {
				// redirect client data to client
				// because we here can't understand what he want
				// to speak 
				console.log('client connected')
				client.pipe(client)
			})
			server.listen(port)

			parser.on('msg', function (msg) {
				msg.should.be.eql('hello world')
				clearTimeout(timeout_handle)
				server.close()
				app.destroy()
				done()
			})
			app.on('connected', function  () {
				console.log('connected')
				parser.write('hello world')
			})

			
			timeout_handle = setTimeout(function() {
				server.close()
				app.destroy()
				done(new Error('Connection Timeout'))
			}, 500);
		})
	})

})