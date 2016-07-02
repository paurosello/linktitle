//In order for this to work, the Document type needs to have a link_title field

frappe.ui.form.ControlLink = frappe.ui.form.ControlData.extend({
	set_input: function(value) {
		this.value = value;
		this.$input && this.$input.val(this.format_for_input(value));
		this.set_disp_area();
		this.last_value = value;
		this.set_mandatory && this.set_mandatory(value);

		var me = this;
		
		if(typeof(this.value) !== 'undefined' && this.value!=""){
			frappe.call({
					method:"linktitle.routes.title_field",
					args: {
						  doctype: me.df.options, name: me.value
					},
					callback: function(c){
						me.$title.html(c.message)
						me.$input.css("display", "none");
						me.$title_div.css("display", "");
					},
					error: function() {
					}
			})
		}
		else{
			this.$title_div.css("display", "none");
			this.$input.css("display", "");
		}
		
	},
	make_input: function() {
		var me = this;
		$('<div class="link-field ui-front" style="position: relative;">\
			<input type="text" class="input-with-feedback form-control" autocomplete="off">\
			<div class="title_div" style="display:none">\
				<div style="display: inline-block; width: 90%;margin-top:5px">\
					<span class="title" style="font-weight: bold;"></span>\
					<a style="color: grey; margin-left: 5px;" class="open_doc no-decoration" title="' + __("Open Link") + '"><i class="icon-link"></i></a>\
				</div>\
				<i id="remove" class="octicon octicon-x" style="margin-left: 5px;    color: red; cursor: pointer;"></i>\
			</div>\
			<span class="link-btn">\
				<a class="btn-open no-decoration" title="' + __("Open Link") + '">\
					<i class="icon-link"></i></a>\
			</span>\
		</div>').prependTo(this.input_area);
		this.$input_area = $(this.input_area);
		this.$input = this.$input_area.find('input');
		this.$link = this.$input_area.find('.link-btn');
		this.$link_open = this.$link.find('.btn-open');
		this.$title = this.$input_area.find('.title');
		this.$title_div = this.$input_area.find('.title_div');
		this.$remove = this.$input_area.find('#remove');
		this.$open_doc = this.$input_area.find('.open_doc');

		this.$remove.on("click", function() {
			me.$input.val("");
			me.parse_validate_and_set_in_model("");
			me.$input.trigger("change");
			me.$input.css("display", "");
			me.$title_div.css("display", "none");
		});
		
		this.$open_doc.on("click", function() {
				console.log("hello")
			    window.location =  '#Form/' + me.get_options() + '/' + me.value;    
		});
							
		this.set_input_attributes();
		this.$input.on("focus", function() {
			var value = me.get_value();
			if(value && me.get_options()) {
				me.$link.toggle(true);
				me.$link_open.attr('href', '#Form/' + me.get_options() + '/' + value);
			}

			setTimeout(function() {
				if(!me.$input.val()) {
					me.$input.autocomplete("search", "");
				}
			}, 500);
		});
		this.$input.on("blur", function() {
			setTimeout(function() { me.$link.toggle(false); }, 500);
		});
		this.input = this.$input.get(0);
		this.has_input = true;
		var me = this;
		this.setup_buttons();
		this.setup_autocomplete();
		if(this.df.change) {
			this.$input.on("change", function() {
				me.df.change.apply(this);
			});
		}
			
	},
	get_options: function() {
		return this.df.options;
	},
	setup_buttons: function() {
		var me = this;

		if(this.only_input && !this.with_link_btn) {
			this.$input_area.find(".link-btn").remove();
		}
	},
	open_advanced_search: function() {
		var doctype = this.get_options();
		if(!doctype) return;
		new frappe.ui.form.LinkSelector({
			doctype: doctype,
			target: this,
			txt: this.get_value()
		});
		return false;
	},
	new_doc: function() {
		var doctype = this.get_options();
		var me = this;

		if(!doctype) return;

		// set values to fill in the new document
		if(this.df.get_route_options_for_new_doc) {
			frappe.route_options = this.df.get_route_options_for_new_doc(this);
		} else {
			frappe.route_options = {};
		}

		// partially entered name field
		frappe.route_options.name_field = this.get_value();

		// reference to calling link
		frappe._from_link = this;
		frappe._from_link_scrollY = $(document).scrollTop();

		frappe.ui.form.quick_entry(doctype, function(doc) {
			if(me.frm) {
				me.parse_validate_and_set_in_model(doc.name);
			} else {
				me.set_value(doc.name);
			}
		});

		return false;
	},
	setup_autocomplete: function() {
		var me = this;
		this.$input.on("blur", function() {
			if(me.selected) {
				me.selected = false;
				return;
			}
			var value = me.get_value();
			if(me.doctype && me.docname) {
				if(value!==me.last_value) {
					me.parse_validate_and_set_in_model(value);
				}
			} else {
				me.set_mandatory(value);
			}
		});

		this.$input.cache = {};
		this.$input.autocomplete({
			minLength: 0,
			autoFocus: true,
			source: function(request, response) {
				var doctype = me.get_options();
				if(!doctype) return;
				if (!me.$input.cache[doctype]) {
					me.$input.cache[doctype] = {};
				}

				if (me.$input.cache[doctype][request.term]!=null) {
					// immediately show from cache
					response(me.$input.cache[doctype][request.term]);
				}

				var args = {
					'txt': request.term,
					'doctype': doctype,
				};

				me.set_custom_query(args);

				return frappe.call({
					type: "GET",
					method:'frappe.desk.search.search_link',
					no_spinner: true,
					args: args,
					callback: function(r) {
						if(!me.$input.is(":focus")) {
							return;
						}

						if(!me.df.only_select) {
							if(frappe.model.can_create(doctype)
								&& me.df.fieldtype !== "Dynamic Link") {
								// new item
								r.results.push({
									value: "<span class='text-primary link-option'>"
										+ "<i class='icon-plus' style='margin-right: 5px;'></i> "
										+ __("Create a new {0}", [__(me.df.options)])
										+ "</span>",
									action: me.new_doc
								});
							};
							// advanced search
							r.results.push({
								value: "<span class='text-primary link-option'>"
									+ "<i class='icon-search' style='margin-right: 5px;'></i> "
									+ __("Advanced Search")
									+ "</span>",
								action: me.open_advanced_search
							});
						}

						me.$input.cache[doctype][request.term] = r.results;
						response(r.results);
					},
				});
			},
			open: function(event, ui) {
				me.$wrapper.css({"z-index": 101});
				me.autocomplete_open = true;
			},
			close: function(event, ui) {
				me.$wrapper.css({"z-index": 1});
				me.autocomplete_open = false;
			},
			focus: function( event, ui ) {
				event.preventDefault();
				if(ui.item.action) {
					return false;
				}
			},
			select: function(event, ui) {
				me.autocomplete_open = false;
				
				// prevent selection on tab
				var TABKEY = 9;
				if(event.keyCode === TABKEY) {
					event.preventDefault();
					me.$input.autocomplete("close");
					return false;
				}

				if(ui.item.action) {
					ui.item.value = "";
					ui.item.action.apply(me);
				}

				// if remember_selected hook is set, add this value
				// to defaults so you do not need to set it again
				// unless it is changed.
				if(frappe.boot.remember_selected && frappe.boot.remember_selected.indexOf(me.df.options)!==-1) {
					frappe.boot.user.defaults[me.df.options] = ui.item.value;
				}

				if(me.frm && me.frm.doc) {
					me.selected = true;
					me.parse_validate_and_set_in_model(ui.item.value);
					setTimeout(function() {
						me.selected = false;
					}, 100);
				} else {
					me.$input.val(ui.item.value);
					me.$input.trigger("change");
					me.set_mandatory(ui.item.value);
				}
			}
		})
		.on("blur", function() {
			$(this).autocomplete("close");
		})
		.data('ui-autocomplete')._renderItem = function(ul, d) {
			var html = "<strong>" + __(d.value) + "</strong>";
			if(d.description && d.value!==d.description) {
				html += '<br><span class="small">' + __(d.description) + '</span>';
			}
			return $('<li></li>')
				.data('item.autocomplete', d)
				.html('<a><p>' + html + '</p></a>')
				.appendTo(ul);
		};
		// remove accessibility span (for now)
		this.$wrapper.find(".ui-helper-hidden-accessible").remove();
	},
	set_custom_query: function(args) {
		var set_nulls = function(obj) {
			$.each(obj, function(key, value) {
				if(value!==undefined) {
					obj[key] = value;
				}
			});
			return obj;
		}
		if(this.get_query || this.df.get_query) {
			var get_query = this.get_query || this.df.get_query;
			if($.isPlainObject(get_query)) {
				var filters = set_nulls(get_query);

				// extend args for custom functions
				$.extend(args, filters);

				// add "filters" for standard query (search.py)
				args.filters = filters;
			} else if(typeof(get_query)==="string") {
				args.query = get_query;
			} else {
				var q = (get_query)(this.frm && this.frm.doc, this.doctype, this.docname);

				if (typeof(q)==="string") {
					args.query = q;
				} else if($.isPlainObject(q)) {
					if(q.filters) {
						set_nulls(q.filters);
					}
					// extend args for custom functions
					$.extend(args, q);

					// add "filters" for standard query (search.py)
					args.filters = q.filters;
				}
			}
		}
		if(this.df.filters) {
			set_nulls(this.df.filters);
			if(!args.filters) args.filters = {};
			$.extend(args.filters, this.df.filters);
		}
	},
	validate: function(value, callback) {
		// validate the value just entered
		var me = this;

		if(this.df.options=="[Select]") {
			callback(value);
			return;
		}

		if(this.frm) {
			this.frm.script_manager.validate_link_and_fetch(this.df, this.get_options(),
				this.docname, value, callback);
		}
	}
});