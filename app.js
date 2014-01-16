#!/usr/bin/env node

var Firebase = require('firebase'),
    fbutil   = require('./fbutil'),
    fburl = 'https://' + process.env.FB_NAME + '.firebaseio.com/',
    express = require('express'),
    app = express();

app.use(express.static(__dirname));

fbutil.auth(fburl, process.env.FB_TOKEN).done(function() {
   var    F = new Firebase(fburl),
       main = F.child("activities"),
      lists = F.child("lists"),
       itags = F.child("indexed_tags");

   function add_list_entries(key, data, tags){
      tags.forEach(function(t){
         if (data.schedct) lists.child(t).child('popular').child(key).setWithPriority(data, data.schedct);
         if (data, data.ctime) lists.child(t).child('recent').child(key).setWithPriority(data, data.ctime);
         itags.child(key).child(t).set(true);
      });
   }

   function remove_list_entries(key, tags){
      tags.forEach(function(t){
         lists.child(t).child('popular').child(key).remove();
         lists.child(t).child('recent').child(key).remove();
         itags.child(key).child(t).remove();
      });   
   }

   main.on('child_added', function(snap){
      var key = snap.name(), data = snap.val();
      add_list_entries(key, data, data.tags.split(' '));
   });

   main.on('child_changed', function(snap){
      var key = snap.name(), data = snap.val();
      add_list_entries(key, data, data.tags.split(' '));
      itags.child(key).once('value', function(snap){
         var prev_tags = Object.keys(snap.val());
         var removed_tags = prev_tags.filter(function(x) { return data.tags.split(' ').indexOf(x) < 0 });
         remove_list_entries(key, removed_tags);
      });
  });

   main.on('child_removed', function(snap){
      var key = snap.name(), data = snap.val();
      itags.child(key).once('value', function(snap){
         remove_list_entries(key, Object.keys(snap.val()));
         itags.child(key).remove();
      });
   });
});

app.listen(process.env.PORT || 3000);
