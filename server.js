var server = require('http').createServer();
var io = require('socket.io')(server);
let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://127.0.0.1:27017/fc";
let mongo;
let users;

MongoClient.connect(url, function(err, db) {
	if (err) throw err;
	mongo = db;
	users = db.db("fc").collection("users");
	 //console.log("Povezan na bazu!") //povezuje se na mongo db
});

var players = {}; //igrači trenutno u igri

io.sockets.on('connection', function(socket) {
	console.log("Igrač povezan!",socket.id);
    socket.on ('initialize', function () {
       var id = socket.id;
        /*var newPlayer = new Player (id);
        players[id] = newPlayer;*/
        socket.emit ('playerData', {id: id, players: players});
        socket.broadcast.emit ('playerJoined', players[socket.id]);
    });
    socket.on ('login', function(data){
    	loginCheck(socket,data);
    });
    socket.on ('register', function(data){
    	registerCheck(socket,data);
    });
    socket.on ('positionUpdate', function(data){
    	if(data.id in players){
	     	players[data.id].x = data.x;
	    	players[data.id].y = data.y;
	    	players[data.id].z = data.z;
	    	players[data.id].ry = data.ry;
	    	socket.broadcast.emit('playerMoved', {id: data.id, x: data.x, y: data.y, z: data.z, ry: data.ry});   		
    	}
    });
    socket.on ('changeAnim', function(data){
    	if(data.id in players){
    		players[data.id].anim = data.anim;
    		socket.broadcast.emit('changeAnim', {id: data.id, anim:data.anim});
    	}
    });
    socket.on ('chatMSG', function(data){
    	console.log(data.nickname, data.poruka);
    	io.emit('chatMSG', {nickname: data.nickname, poruka:data.poruka});
    });
    socket.on('disconnect',function(){
    	console.log("Igrač diskonektovan!");
        delete players[socket.id];
        socket.broadcast.emit('killPlayer',socket.id);
     })
});

function loginCheck(socket,data){;
	users.findOne({username: data.username}, function (err,res){
		if(res != null && res.password === data.password){ //ako ga ima u bazi i password tačan
			let noingame = true;
			for(id in players){ //proveri da li je već u igri
				if(players[id].username === data.username){
					noingame = false;
					socket.emit('login',{result: false, reason: "you are already in game"});
					break;
				}
			}
			if(noingame === true){ //ako nije u igri
				if(res.nochar === true){ // nema kreiranog karaktera
					socket.emit('login',{result: true, nochar: true});
				}else{ // ima kreiranog karaktera
					players[socket.id] = res;
					players[socket.id].id = socket.id;
					socket.emit('login',{result: true, nochar: false});
				}
			}
		}else{
			socket.emit('login',{result: false, reason: "wrong username or password"});
		}
	});
}
function registerCheck(socket,data){
	users.findOne({username: data.username}, function (err,res){
		if(res === null){ //ako ne postoji takav username
	  		users.insertOne({username: data.username, password: data.password, nochar: true}, function(err, res){
	  			socket.emit('register',{result:true});
	  		});
		}else{
			socket.emit('register',{result:false});;
		}
	});
}

console.log ('Server pokrenut.');
server.listen(3000, '0.0.0.0');
