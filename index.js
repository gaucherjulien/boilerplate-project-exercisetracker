const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let bodyParser = require ('body-parser');
let mongoose = require ("mongoose");

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use ("/", bodyParser.urlencoded ({extended: false}));

const exerciseSchema = new mongoose.Schema ({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    min: 1,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
});
const Exercise = mongoose.model ('Exercise', exerciseSchema);

const userSchema = new mongoose.Schema ({
  username: {
    type: String,
    required: true
  },
  log: [{type: mongoose.Schema.Types.ObjectId, ref: 'Exercise'}]
});
const User = mongoose.model ('User', userSchema);

// const LogSchema = new mongoose.Schema ({
//   username: String,
//   log: [{type: mongoose.Schema.Types.ObjectId, ref: 'Exercise'}]
// });
// const Log = mongoose.model ('Log', LogSchema);


app.post ("/api/users", (req, res) => {

  //User.deleteMany ({}, (err, data) => {});
  
  const user = new User({username: req.body.username, exercises: []});
  user.save ((err, data) => {
    if (err) {return console.error (err);}
    else {res.json (data);}
  });
});

app.get ("/api/users", (req, res) => {
  User.find ({}, (err, data) => {
    if (err) {return console.error (err);}
    else {res.json (data);}
  });
});

app.post ("/api/users/:_id/exercises", (req, res) => {

  //Exercise.deleteMany ({}, (err, data) => {});

  const description = req.body.description
  let duration = req.body.duration
  if (!duration || isNaN (duration)) {
    duration = 1;
  }

  const date_string = req.body.date;
  if (!date_string) {
    date = new Date();
  } else if (isNaN (date_string)) {
    date = new Date(date_string);
  } else {
    date = new Date (Number (date_string));
  }

  const exercise = new Exercise ({"description": description, "duration": duration, "date": date});
  exercise.save ((err, data) => {
    if (err) {
      res.send (err);
      return;
    }

    User.findById (req.params._id, (err, user) => {
      if (err) {
        res.send (err);
        return;
      }
      if (!user) {
        s = `User not found: '${req.params._id}'`;
        res.json ({"error": s});
        return;
      }

      user.log.push (exercise);
      user.save ((err, updated) => {
        if (err) {
          res.send (err);
          return;
        }
      
        let j = updated.toJSON();
        j.duration = Number (duration);
        j.description = description;
        j.date = date.toDateString();

        j = {
          "username": user.username,
          "description": description,
          "duration": Number (duration),
          "date": date.toDateString(),
          "_id": updated._id 
        };

        res.json (j);
      });
    });
  });
});

app.get ("/api/users/:_id/logs", (req, res) => {

  let j;

  User.findById (req.params._id)

    .then (user => {
      if (!user) {
        throw {"error": `User not found: ${req.params._id}`};
      }

      j = user.toJSON();
      j.count = user.log.length;
      j.log = []

      // filter = {"_id": {$in: user.log}};

      // if (req.query.from || req.query.to)
      // {
      //   filter ["date"] = {};
      //   if (req.query.from) {filter ["date"][$min] = "toto";}//new Date (req.query.from);}
      //   if (req.query.to) {filter ["date"][$max] = new Date (req.query.to);}
      // }

      // ret = Exercise.find (filter);

      let query = Exercise.find({});
      query.where ("_id").in (user.log);
      if (req.query.from) {query.where ("date").gte (new Date (req.query.from));}
      if (req.query.to) {query.where ("date").lte (new Date (req.query.to));}

      if (req.query.limit && !isNaN (req.query.limit)) {
        query.limit (req.query.limit);
      }

      return query;
    })

    .then (exercises => {

      for (e of exercises) {
        j.log.push ({
          "description": e.description,
          "duration": Number (e.duration),
          "date": e.date.toDateString(),
        });
      }

      res.send (j);
    })

    .catch (error => {
      res.send (error);
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
