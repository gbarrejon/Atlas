function connError(res) {
  console.log('error de conexión a Atlas, con esta URL: ', url);
  res.send({ ok: false, message: 'Express no puede conectar con Atlas, espera un momento, por favor' })
}

class App {
  constructor(){ }
  static showCollection(req, res){
    if ( !mongoCli ){ connError(res) } else {
      mongoCli.db(req.params.db).collection(req.params.collection).find().sort({}).toArray( (err, results) => { 
        res.send(results ? results : err)
      });
    }  
  }
  static showDocument(req, res){
    if (!mongoCli){ connError(res) } else {    
      // los ObjectId de Mongo son string de 24 caracteres Hexadecimales, 
      // si no mide 24, no hay que buscar porque petaría el server al crear el ObjectId();
      if ( req.params.id.length !== 24 ) { res.send({}) }
      else {
        mongoCli.db(req.params.db).collection(req.params.collection)
        .findOne(
          { _id: new mongo.ObjectId(req.params.id) }, 
          (err, results) => { 
            res.send(results ? results : err);
          });  
      }
    }
  }  
  static server(req, res){
    res.download('serverOOP.js');
  }
  static _update(req, res){
    console.log('update', req.body )
    let id = ( req.body._id && req.body._id.length == 24 ) ? new mongo.ObjectID(req.body._id) : new mongo.ObjectID()
    // hace update si recibe _id en body, e insert en otro caso:    
    delete req.body._id
    mongoCli.db(req.params.db).collection(req.params.collection).replaceOne(
      { _id: id}, req.body, {upsert: true},
      (err, data) => { res.send(data ? data : err) }
    );
  }
  static _delete(req, res){
    console.log(`deleting...: ${JSON.stringify(req.params)}`)
    mongoCli.db(req.params.db).collection(req.params.collection).deleteOne({ _id: new mongo.ObjectID(req.params.id) }, (err, data) => { res.send( data ? data : err) })
  }
  static getDbs(req, res){
    const adminDb = mongoCli.db().admin();
    adminDb.listDatabases(function(err, data) { res.send(data ? data.databases : err) });    
  }
  static getCollections(req, res){
    mongoCli.db(req.query.db).listCollections().toArray( (e,d) =>  res.send(d ? d : e) );    
  }
  
}

const express = require('express');
const mongo = require('mongodb');
const bodyParser = require('body-parser');
const app = express();
const url = process.argv[2];
const port = process.argv[3] ? process.argv[3] : 3000
var mongoCli = null;

mongo.MongoClient.connect(url, (err, client) => mongoCli = client );

app.use(bodyParser.json());
app.use( express.static('public') );
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");  
  res.header('Content-Type', 'application/json');
  next();
});

app.get( '/:db/:collection', App.showCollection ); // curl http://localhost:3000/domingo/posts
app.post( '/:db/:collection', App._update ); 
app.delete( '/:db/:collection/:id', App._delete ); 

app.get('/:db/:collection/:id', App.showDocument ); // curl http://localhost:3000/domingo/posts/5b5993710668260c701655d4
app.get('/server', App.server ); // curl http://localhost:3000/server
app.post('/update', App._update ); // curl -X POST http://localhost:3000/update -H "Content-Type: application/json" -d '{ "_id": "5b59940d0668260c701655d5",  "nombre": "Antonio", "texto": "artículo de Antonio"}'
app.post('/delete', App._delete ); // curl -X POST localhost:3000/delete -H "Content-Type: application/json" -d '{ "_id": "5b59940d0668260c701655d5" }'
app.get('/dbs', App.getDbs );
app.get('/colls', App.getCollections ); // curl localhost:3000/colls?db=test
app.get('/test', (req, res) => {})

app.listen(port, function() {
  console.log(`iniciado server en puerto ${port} a las ${new Date()}`)
})


