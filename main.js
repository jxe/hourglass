var page = 'categories', category = 'all';

var q = Fireball("https://sandstore.firebaseio.com", {
	show_when: { '.page': function(el){ return page == el.id; } },

	map: {
		"#dockitems...": ["dockitems_by_category/main", function(val){
			if (category == 'all') return val;
			var new_val = {};
			for (var k in val){
				if (val[k].category == category) new_val[k] = val[k];
				else if (!val[k].category && category == 'unsorted') new_val[k] = val[k];
			}
			console.log(new_val);
			return new_val;
		}],
		"#activity": "dockitems_by_category/main/$activity"
	},

	on_change: {
		'#suggestions_desc': function(el){
			Fireball('#activity').update({ 'suggestions_desc': el.value });
		},
		'#suggestions_url': function(el){
			Fireball('#activity').update({ 'suggestions_url': el.value });
		}
	},

	on_click: {
		'#activity button': function(){
			var data = Fireball.latest('#activity');
			var title = data.title.replace(' ', '+');	
			var url = "sandapp:dockitem?title="+title+"&image_url="+data.image_url;
			if (data.suggestions_desc) url += "&suggestions_desc=" + encodeURIComponent(data.suggestions_desc);
			if (data.suggestions_url) url += "&suggestions_url=" + encodeURIComponent(data.suggestions_url);
			window.location = url;
		},

		'#go_add':  function(){
			var title = prompt('Title:');
			if (!title) return;
			window.add_title = title;
			document.getElementById('add_title').innerHTML = window.add_title;
			page = 'add';
		},
		'#go_back': function(){ page = 'home'; },
		'#go_categories':  function(){ page = 'categories';  },

		// "#add_dockitem": function(){
		// 	var title, image_url;
		// 	if (!(title = prompt('Title:'))) return;
		// 	if (!(image_url = prompt('Image URL:'))) return;
		// 	q.domref('#dockitems').push({
		// 		title: title, 
		// 		image_url: image_url
		// 	});
		// },

		'#dockitems a': function(el){
			page = 'edit';
			Fireball.set('$activity', el.parentNode.id);
			return;

			// var data = el.parentNode.data;
			// var cat = prompt('New Category:', data.category);
			// if (cat) q.domref('#dockitems').child(el.parentNode.id).update({category: cat});

			// var suggestions_desc = prompt('suggestions_desc:');
			// if (!suggestions_desc) return;
			// var suggestions_url = prompt('suggestions_url:');
			// if (!suggestions_url) return;

			// q.domref('#dockitems').child(el.parentNode.id).update({
			// 	suggestions_url: suggestions_url,
			// 	suggestions_desc: suggestions_desc
			// });
		},

		'#categories a': function(el){
			category = el.innerText.toLowerCase().replace(/ /g, '-');
			if (category == 'get-togethers') category = 'soc';
			if (category == 'me-time') category = 'me';
			page = 'home';
			Fireball.refresh('#dockitems...');
		},

		'.insta_image': function(el){
			var img_url = el.getAttribute('url');
			var title = el.getAttribute('title');
			var yes = confirm('Really add a dockitem with this photo and title: ' + window.add_title + '?');
			if (yes){
				var id = Fireball('#dockitems').push({
					title: window.add_title, 
					image_url: img_url,
					category: category
				}).name();
				Fireball.set('$activity', id);
				page = 'edit';
			}
		},

		'#load_instafeed': function(){
			var title = prompt('Query: ');
			if (!title) return;
			var feed = new Instafeed({
			        get: 'tagged',
			        tagName: title,
			        template: '<a title="'+window.add_title+'" url="{{image}}" class="insta_image" href="#"><img src="{{image}}" /><h2>'+window.add_title+'</h2></a>',
			        clientId: 'eabce8dcad66460c87edc348328c602f'
		    });
		    feed.run();
		}
	}
})
