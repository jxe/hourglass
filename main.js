var page = 'categories', category = 'all';

var q = Quickfire("https://sandstore.firebaseio.com", {
	init: function(q){
		q.param('$category', 'main');
	},

	visibility: {
		'.page': function(el){ return page == el.id; }
	},

	filters:{
		"#dockitems": function(val){
			if (category == 'all') return val;
			var new_val = {};
			for (var k in val){
				if (val[k].category == category) new_val[k] = val[k];
				else if (!val[k].category && category == 'unsorted') new_val[k] = val[k];
			}				
			return new_val;
		}
	},

	live_updating: {
		"#dockitems": "dockitems_by_category/$category[]",
		"#activity": "dockitems_by_category/$category/$activity"
	},

	computed_fields: {
		"#activity": {
			'url': function(data){
				var title = data.title.replace(' ', '+');	
				var url = "sandapp:dockitem?title="+title+"&image_url="+data.image_url;
				if (data.suggestions_desc) url += "&suggestions_desc=" + encodeURIComponent(data.suggestions_desc);
				if (data.suggestions_url) url += "&suggestions_url=" + encodeURIComponent(data.suggestions_url);
				return url;
			}
		}
	},

	on_click: {
		'#activity button': function(){
			
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

		'a.edit': function(el){
			page = 'edit';
			q.param('$activity', el.parentNode.id);
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
			Quickfire.reproject_collection('#dockitems');
		},

		'.insta_image': function(el){
			var img_url = el.getAttribute('url');
			var title = el.getAttribute('title');
			var yes = confirm('Really add a dockitem with this photo and title: ' + window.add_title + '?');
			if (yes){
				q.domref('#dockitems').push({
					title: window.add_title, 
					image_url: img_url,
					category: category
				});
				page = 'home';
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
