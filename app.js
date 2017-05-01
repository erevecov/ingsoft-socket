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

/*
var events = [ 
  { 
  	title: 'title1',
    start: '2017-05-02T09:40:00',
    end: '2017-05-02T10:10:00' 
  },
  { 
  	title: 'title2',
    start: '2017-05-03T10:40:00',
    end: '2017-05-03T11:00:00' 
  },
  { 
  	title: 'title3',
    start: '2017-05-04T10:00:00',
    end: '2017-05-04T10:30:00' 
  }
];
*/

io.on('connection', function(socket){

	socket.on('disconnect', function(){
		console.log('user disconnected');
	});

	socket.on('room', function(data){ // cuando se conecta un usuario
    	pool.connect(function(err, client, done) {
		  if(err) {
		    return console.error('error fetching client from pool', err);
		  }
		  client.query(`SELECT schedule.id, schedule.start, schedule.finish AS end, schedule.client_name AS title  
		  				FROM schedule
		  				WHERE schedule.room = (SELECT rooms.id FROM rooms WHERE rooms.name = '${data}')`, function(err, result) { 
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

});

http.listen(3000, function(){
  console.log('listening on *:3000');
});