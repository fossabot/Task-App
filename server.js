const express = require('express')
const Guid = require('guid')
const uuid = require('uuid')
const bodyParser = require('body-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const pug = require('pug')
const Request = require('request')
const Querystring = require('querystring')
const mysql = require('mysql');
const serveStatic = require('serve-static')
const path = require('path')
const compression = require('compression')

const app = express()

var server = app.listen(3000)
const io = require('socket.io').listen(server);

require('dotenv').config()

var csrf_guid = uuid.v4()
const api_version = 'v1.0'
const app_id = process.env.APP_ID
const app_secret = process.env.APP_SECRET
const me_endpoint_base_url = 'https://graph.accountkit.com/v1.0/me'
const token_exchange_base_url = 'https://graph.accountkit.com/v1.0/access_token'

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASS,
    database: 'taskapp'
})

connection.connect(function(err) {
    if (!err) {
        console.log("Database is connected ")
    } else {
        console.log("Error connecting database nn")
    }
})

app.use(compression())
app.use(serveStatic(path.join(__dirname, 'public'), {
  maxAge: 60*60
}))

app.use(bodyParser.json()) // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}))

app.set('views', './public/views')
app.set('view engine', 'pug')

app.use(session({
    genid: function(req) {
        return uuid.v4() // use UUIDs for session IDs
    },
    store: new RedisStore(),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}))

app.get('/', function(req, res) {
    console.log(req.session.user_id)
    if (req.session.user_id) {
        res.render('index')
    } else {
        let sess = req.session
        let view = {
            appId: app_id,
            csrf: csrf_guid,
            version: 'v1.0',
        }
        res.render('login', {
            data: view.csrf
        })
    }
})

app.post('/home', function(request, response) {
    // CSRF check
    if (request.body.csrf_nonce === csrf_guid) {
        var app_access_token = ['AA', app_id, app_secret].join('|')
        var params = {
            grant_type: 'authorization_code',
            code: request.body.code,
            access_token: app_access_token
        };

        // exchange tokens
        var token_exchange_url = token_exchange_base_url + '?' + Querystring.stringify(params)
        Request.get({
            url: token_exchange_url,
            json: true
        }, function(err, resp, respBody) {
            var view = {
                user_access_token: respBody.access_token,
                expires_at: respBody.expires_at,
                user_id: respBody.id,
            };

            // get account details at /me endpoint
            var me_endpoint_url = me_endpoint_base_url + '?access_token=' + respBody.access_token;
            Request.get({
                url: me_endpoint_url,
                json: true
            }, function(err, resp, respBody) {
                view.phone_num = request.body.mobile
                connection.query('SELECT * from userinfo WHERE id = ?', view.user_id, (err, data) => {
                    if (err) throw err
                    if (data.length < 1) response.render('home', view)
                    else {
                        request.session.user_id = view.user_id
                        response.redirect('/')
                    }
                })
            });
        });
    } else {
        response.writeHead(200, {
            'Content-Type': 'text/html'
        })
        response.end("Something went wrong. :( ")
    }
});

app.post('/updateprofile', (req, res) => {
    req.session.user_id = req.body.user_id
    let profileobj = {
        id: req.body.user_id,
        fname: req.body.fname,
        lname: req.body.lname,
        email: req.body.email,
        mobile: req.body.phone_num
    }
    connection.query('INSERT into userinfo SET ?', profileobj, function(err, reply) {
        if (err) throw err
        res.redirect('/')
    })
})

app.get('/getuserdata', (req, res) => {
    connection.query('SELECT * from userinfo', (err, data) => {
        res.send(data)
    })
})

app.get('/userdata', (req, res) => {
    connection.query('SELECT * FROM userinfo WHERE id = ?', req.session.user_id, (err, data) => {
        res.send(data[0])
    })
})
app.post('/formsubmit', (req, res) => {
    const taskObject = {
        id: uuid.v4(),
        title: req.body.task_name,
        details: req.body.task_details,
        date: req.body.date,
        duedate: req.body.duedate,
        taskby: req.session.user_id,
        taskto: req.body.taskto_id,
        status: "Not Completed",
        deleted: "false"
    }
    connection.query('INSERT into tasks SET ?', taskObject, (err, reply) => {
        if (err) throw err
        res.redirect('/')
    })
})
app.get('/getdashboard', (req, res) => {
        connection.query('SELECT * FROM tasks WHERE taskto = ?', req.session.user_id, (err1, data1) => {
          connection.query('SELECT * FROM userinfo',(err2, data2) => {
            let userlist = {}
            data2.map(function(x){
              userlist[x.id] = x.fname +" "+ x.lname
            })
             res.send({
               taskto: data1,
               userlist: userlist
             })
          })
        })
})

app.get('/usertasks',(req, res)=>{
  console.log('user Requested')
  connection.query('SELECT * FROM tasks WHERE taskby = ?', req.session.user_id, (err, data) => {
      connection.query('SELECT * FROM userinfo',(err2, data2) => {
        let userlist = {}
        data2.map(function(x){
          userlist[x.id] = x.fname +" "+ x.lname
        })
         res.send({
           taskby: data,
           userlist: userlist
         })
      })
    })
})
app.get('/delete/:id/:userid', (req, res) => {
    console.log(req.session.user_id,req.params.userid)
    if (req.session.user_id === req.params.userid) {
        connection.query('DELETE from tasks WHERE id = ? and taskby = ?',[req.params.id,req.params.userid],(err, reply)=>{
          console.log(reply)
          res.redirect('/')
        })
    } else {
        res.redirect('/')
    }
})

app.get('/updatetask/:id/:userid/:status', (req, res) => {
  console.log(req.session.user_id,req.params.userid)
  let x = "Not Completed"
  if (req.session.user_id === req.params.userid) {
    if(req.params.status === "Not Completed") x = "Completed"
    connection.query('UPDATE tasks SET status = ? WHERE id = ? and taskto = ?',[x, req.params.id,req.params.userid],(err, reply)=>{
      console.log(req.params.id,req.params.status)
  })
    res.redirect('/')
}

})

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.log(err)
        else res.redirect('/')
    });
});

io.on('connection', function (socket) {
  socket.on('join',function(name){
    console.log(name + 'Connected')
  })
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
  });
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

});
