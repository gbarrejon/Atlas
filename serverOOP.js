function connError(res) {
  console.log('error de conexión a Atlas, con esta URL: ', url);
  res.send({ ok: false, message: 'Express no puede conectar con Atlas, espera un momento, por favor' })
}

function logIp(req, msg, data){
  console.log('------------------------------->')
  console.log('new request at', new Date().toLocaleString());
  console.log(msg, req.socket.remoteAddress)
  console.log(data)
}

function isAdmin(cred){
  let userPass = (url.split('//')[1]).split('@')[0]  
  if (userPass == cred){ return true } else { return false}  
}

class App {
  constructor(){ }
  static showCollection(req, res){
    logIp(req, 'App.showCollection() from IP:', {});
    if ( !mongoCli ){ connError(res) } else {
      mongoCli.db(req.params.db).collection(req.params.collection).find().sort()
      .toArray( (err, results) => { 
        res.send(results ? results : err)
      });
    }  
  }

  static findSort(req, res){
    logIp(req, 'App.findSort() from IP:',  req.body );
    if ( !mongoCli ){ connError(res) } else {      
      mongoCli.db(req.body.db).collection(req.body.collection)
      .find(req.body.find)
      .sort(req.body.sort).toArray( (err, results) => { 
        res.send(results ? results : err)
      });
    }  
  }

  static showDocument(req, res){
    logIp(req, 'App.showDocument() from IP:', req.body);
    if (!mongoCli){ connError(res) } else {    
      mongoCli.db(req.params.db).collection(req.params.collection)
        .findOne(
          { _id: req.params.id }, 
          (err, results) => { 
            res.send(results ? results : err);
          });  
      // los ObjectId de Mongo son string de 24 caracteres Hexadecimales, 
      // si no mide 24, no hay que buscar porque petaría el server al crear el ObjectId();
      // if ( req.params.id.length !== 24 ) { res.send({}) }
      // else {
      //   mongoCli.db(req.params.db).collection(req.params.collection)
      //   .findOne(
      //     { _id: new mongo.ObjectId(req.params.id) }, 
      //     (err, results) => { 
      //       res.send(results ? results : err);
      //     });  
      // }

    }
  }  
  static server(req, res){
    logIp(req, 'App.server() from IP:', {});
    res.download('serverOOP.js');
  }
  static replaceOne(req, res){
    logIp(req, 'App._update() from IP:', req.body);
    let id = ( req.body._id && req.body._id.length == 24 ) ? new mongo.ObjectID(req.body._id) : new mongo.ObjectID()
    // hace update si recibe _id en body, e insert en otro caso:    
    delete req.body._id
    if ( !mongoCli ){ connError(res) } else { 
      mongoCli.db(req.params.db).collection(req.params.collection).replaceOne(
        { _id: id}, req.body, {upsert: true},
        (err, data) => { res.send(data ? data : err) }
      );
    }
  }
  static deleteOne(req, res){    
    logIp(req, 'App._delete() from IP:', req.params);
    // console.log(`deleting: ${JSON.stringify(req.params)}`)
    if ( !mongoCli ){ connError(res) } else { 
      mongoCli.db(req.params.db).collection(req.params.collection)
      .deleteOne({ _id: new mongo.ObjectID(req.params.id) }, (err, data) => { res.send( data ? data : err) });
    }
  }
  static getDbs(req, res){
    logIp(req, 'App.getDbs() from IP:', {});
    if ( !mongoCli ){ connError(res) } else { 
      const adminDb = mongoCli.db().admin();
      adminDb.listDatabases(function(err, data) { res.send(data ? data.databases : err) });   
    } 
  }
  static getCollections(req, res){
    logIp(req, 'App.getCollections() from IP:', req.query);
    if ( !mongoCli ){ connError(res) } else { 
      mongoCli.db(req.query.db).listCollections().toArray( (e,d) =>  res.send(d ? d : e) );    
    }
  }
  static insertMany(req, res){
    logIp(req, 'App.updateMany() from IP:', req.query);
    if ( !mongoCli || !isAdmin(req.query.c) ){ connError(res) } else { 
      mongoCli.db(req.params.db).collection(req.params.collection).deleteMany({}, d => {
        mongoCli.db(req.params.db).collection(req.params.collection).insertMany( req.body, (err, data) => res.send( data ? data : err ));
      });
      
    }
  }
  static dropCollection(req, res){    
    logIp(req, 'App.dropCollection() from IP:', req.params);
    if ( !mongoCli || !isAdmin(req.query.c) ){ connError(res) } else { 
      mongoCli.db(req.params.db).collection(req.params.collection).drop( d => res.send(d));
    }
  }
}
//
const express = require('express');
const mongo = require('mongodb');
const bodyParser = require('body-parser');
const app = express();
const fs = require('fs');
var mongoConf = { url: ''};
if ( process.argv[2] == 'auto' ) {
  mongoConf = JSON.parse( fs.readFileSync('./conf.json').toString() );
} else {
  mongoConf.url = process.argv[2];
}
const url = mongoConf.url ;
console.log(mongoConf)
const port = process.argv[3] ? process.argv[3] : 3000
var mongoCli = null;

mongo.MongoClient.connect(url, (err, client) => {
  if ( client ){ mongoCli = client}
  else { 
    console.log('hay un error en MongoClient.connect()');
    console.log(err);
  }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use( express.static('public') );
app.use( (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");  
  res.header('Content-Type', 'application/json');
  next();
});

app.get( '/:db/:collection', App.showCollection ); // curl http://localhost:3000/domingo/posts
app.post( '/:db/:collection', App.replaceOne ); // curl -X POST http://localhost:3000/domingo/posts -d '{}'
app.put('/:db/:collection', App.insertMany );
app.delete( '/:db/:collection', App.dropCollection );

app.delete( '/:db/:collection/:id', App.deleteOne ); // curl -X DELETE http://localhost:3000/domingo/posts/5b5993710668260c701655d4 
app.get('/:db/:collection/:id', App.showDocument ); // curl http://localhost:3000/domingo/posts/5b5993710668260c701655d4

app.post('/findSort', App.findSort ); 

app.get('/server', App.server ); 
app.get('/dbs', App.getDbs );
app.get('/colls', App.getCollections ); // curl localhost:3000/colls?db=test
app.get('/test', (req, res) => { 
})

app.listen(port, function() {
  console.log(`iniciado server en puerto ${port} a las ${new Date()}`);
})



