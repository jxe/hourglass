(function(){



	// some rad extensions to firebase itself

	var dyns = [], vars = {};


	// like 'child' except it supports "dynamic paths"
	// with on() subscriptions that get remade when the 
	// paths change
	Firebase.prototype.dynamic = function(path){
		var dyn = {
			root:this,
			path:path,
			expanded_path: null,
			live_ref: null,
			subs: [],

			uses_var: function(v){
				return this.path.indexOf(v) != -1;
			},
			expand_path: function(){
				var incomplete = false;
				var expanded = this.path.replace(/\$(\w+)/g, function(match){
					if (!vars[match]) incomplete = true;
					else return vars[match];
				});
				if (!incomplete) return expanded;
			},
			is_path_up_to_date: function(){
				return (this.expanded_path && this.expanded_path == this.expand_path());
			},
			update_ref: function(){
				// console.log("updating ref: ", this.path);
				var new_path = this.expand_path();
				if (new_path != this.expanded_path){
					// console.log("new path: ", new_path);
					this.teardown_subs();
					this.live_ref = null;
					this.expanded_path = null;
					if (new_path){
						this.expanded_path = new_path;
						this.live_ref = this.ref_for_expanded_path(new_path);
						this.setup_subs();
					}
				}
			},
			ref_for_expanded_path: function(path){
				var m, rx = /\[(\d*)\]$/;
				if (m = path.match(rx)){
					path = path.replace(rx, '');
					if (Number(m[1])) return this.root.child(path).limit(Number(m[1]));
				}
				return this.root.child(path);
			},
			teardown_subs: function(){
				var ref = this.live_ref;
				if (!ref) return;
				this.subs.forEach(function(s){
					ref.off(s[0], s[1]);
				});
			},
			setup_subs: function(){
				var ref = this.live_ref;
				if (!ref) return;
				this.subs.forEach(function(s){ ref.on(s[0], s[1]); });
			},
			on: function(ev, cb){
				this.subs.push([ev, cb]);
				if (this.live_ref) this.live_ref.on(ev,cb);
			}
		};
		dyn.update_ref();
		dyns.push(dyn);
		return dyn;
	};

	Firebase.prototype.param = function(v, value){
		// console.log("setting param: ", v, value);
		if (!value) return vars[v];
		vars[v] = value;
		dyns.forEach(function(dyn){ if (dyn.uses_var(v)) dyn.update_ref(); });
		return value;
	};





	// Quickfire

	var templates = {}, mapping = {}, computed_fields = {};
	var visiblity = {}, on_click = {};

	function matches(element, selector){
		if (!element || element.nodeType !== 1) return false;
	    var m = element.webkitMatchesSelector || element.mozMatchesSelector ||
	            element.oMatchesSelector || element.matchesSelector || element.matches;
	    return m.call(element, selector);
	}

	function closest(node, sel){
	    while (node && !(matches(node, sel))) node = node.parentNode;
	    if (matches(node, sel)) return node;
	}

	function alleach(dom, selector, f){
	  var matches = dom.getElementsByClassName(selector);
	  for (var i = 0; i < matches.length; ++i) f(matches[i]);
	}

	function get_field_value(domid, json, path){
		if (json[path]) return json[path];
		if (computed_fields[domid] && computed_fields[domid][path]) return computed_fields[domid][path](json);
		return null;
	}

	function decorate_element(el, json, domid){
		// console.log("before: ", el);
		var directive = el.getAttribute('data-set');
		if (!directive) return;
		var parts = directive.split(':');
		var attr = parts[0], path = parts[1];
		var val = get_field_value(domid, json, path);
		el.setAttribute(attr, val);
		// console.log("after: ", el);
	}

	function project(json, dom, domid){
		if (typeof json === 'string' || typeof json === 'number'){
		// if (!hasChildElements(dom)){
			dom.innerHTML = json;
			return dom;
		}
		if (json.id) dom.id = json.id;

		decorate_element(dom, json, domid);
		var matches = dom.querySelectorAll('[data-set]');
		for (var i = 0; i < matches.length; i++) {
			var el = matches[i];
			decorate_element(el, json, domid);
		}

		for (var k in json){
			alleach(dom, k, function(m){ m.innerHTML = json[k]; });
		}
		return dom;
	}

	function logdom(str, d){
		console.log(str, d.cloneNode(true));
	}

	function projectAll(array, dom, domid, path){
		logdom('projectAll', dom);
		var doms = [];
		for (var k in array){
			var o = array[k];
			o.id = k;
			var clone = dom.cloneNode(true);
			clone.data = o;
			clone.path = path + '/' + o.id;
			doms.push(project(o, clone, domid));
		}
		return doms;
	}

	function map_to_dom(fbref, domid, path){
		if (!path) {
			for (var k in domid) map_to_dom(fbref, k, domid[k]);
			return;
		}

		var dyn = fbref.dynamic(path);
		mapping[domid] = dyn;

		if (path.match(/\[(\d*)\]$/)){
			// it's a collection
			var outer = document.querySelector(domid);
			if (!outer) return alert("Not found in DOM: " + domid);
			templates[domid] = outer.firstElementChild.cloneNode(true);
			logdom('template', templates[domid]);
			outer.innerHTML = "";
			dyn.on('value', function(snap){
				// console.log('got value for collection', domid);
				var val = snap.val();
				outer.innerHTML = "";
				if (!val) return;
				var dom_objs = projectAll(val, templates[domid], domid, snap.ref().toString());
				// console.log(dom_objs);
				dom_objs.forEach(function(dom){
					outer.appendChild(dom);
				});
			});
		} else {
			// simple object
			dyn.on('value', function(snap){
				var o = snap.val();
				project(o, document.querySelector(domid), domid);
			});
		}
	}

	function refresh(){
		for (var k in visiblity){
			var nodes = document.querySelectorAll(k);
			for (var i = 0; i < nodes.length; i++) {
				var el = nodes[i];
				if (visiblity[k](el)) el.style.display = '';
				else el.style.display = 'none';
			};
		}
	}

	document.addEventListener('DOMContentLoaded', function(){
		refresh();
		document.addEventListener('click', function(ev){
			for (var k in on_click){
				var el = closest(ev.target, k);
				if (el){
					on_click[k](el);
					refresh();
					return false;
				}
			}
		});
	});

	window.Quickfire = function(FURL, obj){
		var F = new Firebase(FURL);
		var helper = {
			domref: function(domid){
				return mapping[domid] && mapping[domid].live_ref;
			},
			param: function(x,y){ return F.param(x,y); }
		};
		if (obj.live_updating) map_to_dom(F, obj.live_updating);
		if (obj.on_click) on_click = obj.on_click;
		if (obj.visiblity) visiblity = obj.visiblity;
		if (obj.computed_fields) computed_fields = obj.computed_fields;
		if (obj.init) obj.init(helper);
		return helper;
	};

	window.Quickfire.refresh = refresh;
})();
