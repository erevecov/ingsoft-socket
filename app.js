var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var pg = require('pg');
var moment = require('moment');

var config = {
  user: 'postgres',  
  database: 'ingsoft',  
  password: 'postgres', 
  host: '168.232.165.15', 
  port: 5432
};
 
var pool = new pg.Pool(config);

io.on('connection', function(socket){

	socket.on('disconnect', function(){
		console.log('user disconnected');
	});

	socket.on('room', function(data){ 
    	pool.connect(function(err, client, done) {
		  if(err) {
		    return console.error('error fetching client from pool', err);
		  }
		  client.query(`SELECT schedule.id, schedule.start, schedule.finish AS end, schedule.client_name AS title  
		  				FROM schedule
		  				WHERE schedule.room = (SELECT rooms.id FROM rooms WHERE rooms.name = '${data.room}')
		  				AND schedule.start > '${data.init}' 
		  				AND schedule.finish < '${data.finish}'`, function(err, result) { 
		    done(err);
		 
		    if(err) {
		      return console.error('error running query', err);
		    }

		    socket.emit('event', result.rows);
		    //console.log(result.rows);
		  });
		});
  	});

	socket.on('event', function(event){
		var init = event.start; 
		var finish = moment(init).add(event.minutes, 'minute');
		var f = moment(finish).format('YYYY-MM-DDTHH:mm:ss');


		pool.connect(function(err, client, done) {
		  if(err) {
		    return console.error('error fetching client from pool', err);
		  }
		  client.query(`INSERT INTO schedule (room, start, finish, client_name)
		  				VALUES ((SELECT rooms.id FROM rooms WHERE rooms.name = '${event.room}'), '${init}', '${f}', '${event.title}') RETURNING *`, function(err, result) { 
		    done(err);
		 
		    if(err) {
		      return console.error('error running query', err);
		    }

		    if (result.rows[0].id) {
		    	var newEvent = {
		    		id: result.rows[0].id,
		    		title: result.rows[0].client_name,
		    		start: result.rows[0].start,
		    		end: result.rows[0].finish
		    	};

		    	io.sockets.emit('newEvent', newEvent);
		    }
		    //socket.emit('event', result.rows);
		    //console.log(result.rows);
		  });
		});
	});


	socket.on('deleteEvent', function(id){
		console.log(id)
		pool.connect(function(err, client, done) {
		  if(err) {
		    return console.error('error fetching client from pool', err);
		  }
		  client.query(`DELETE FROM schedule WHERE id = ${id};`, function(err) { 
		    done(err);
		 
		    if(err) {
		      return console.error('error running query', err);
		    }

		    io.sockets.emit('deleteEvent', id);

		    //socket.emit('event', result.rows);
		    //console.log(result.rows);
		  });
		});
	});

});

http.listen(3000, function(){
  console.log('listening on *:3000');
});