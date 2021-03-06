openerp.web_widget_boolean_switch = function(instance){
    "use strict";

    instance.web.form.widgets.add('boolean_switch',
                                  'instance.web.form.FieldBooleanSwitch');

    $.fn.bootstrapSwitch.defaults.size = 'mini';
    $.fn.bootstrapSwitch.defaults.onColor = 'success';

    instance.web.BooleanSwitchWidget = instance.web.Class.extend({

        init: function(checkboxes, opts, quick_edit_callback){
            var options = _.extend({}, opts ? opts : {});
            this.checkboxes = checkboxes;

            this.quick_edit = options.hasOwnProperty('quick_edit') ?
                options.quick_edit : false;
            var switchOptions = options.hasOwnProperty('extra') ?
                options.extra : {};


            if(options.hasOwnProperty('onSwitchChange')){
                switchOptions.onSwitchChange = options.onSwitchChange;
            }
            this.checkboxes.bootstrapSwitch(switchOptions);
            this.set_disabled(options.hasOwnProperty('disabled') ?
                              options.disabled : !this.quick_edit);
            if(this.quick_edit && quick_edit_callback){
                this.checkboxes.on('switchChange.bootstrapSwitch',
                                   quick_edit_callback);
            }
        },
        set_value: function(value){
            // the third parameter tell if we should skip to fire events
            // and force change the state whatever it's readonly or disabled
            this.checkboxes.bootstrapSwitch('state', value, true);
        },
        set_readonly: function(value){
            this.checkboxes.bootstrapSwitch('readonly', value);
        },
        set_disabled: function(value){
            this.checkboxes.bootstrapSwitch('disabled', value);
        },
    });

    // Form view
    instance.web.form.FieldBooleanSwitch = instance.web.form.AbstractField.extend({

        template: 'FieldBooleanSwitch',

        start: function(){
            this.$checkbox = $("input", this.$el);
            var options = {
                onSwitchChange: _.bind(function(event, state) {
                    // Test effective_readonly in case we are using quick_edit,
                    // and we are not in edit mode.
                    // We could use this.view.get('actual_mode') which sons
                    // semantically better, possible values are
                    // at least `view`, `edit`, `create`... ? to avoid doupt
                    // using bool seems safer!
                    if(!this.get('effective_readonly')){
                        this.internal_set_value(state);
                        event.preventDefault();
                    }
                }, this),
            };
            _.extend(options, this.modifiers ? this.modifiers : {});
            _.extend(options, this.options ? this.options : {});

            this.switcher = new openerp.instances.instance0.web.BooleanSwitchWidget(
                this.$checkbox, options, _.bind(function(event, state) {
                    // keep in mind that in case of view list editable
                    // actual_mode is undefined...
                    if(this.view.get('actual_mode') === 'view'){
                        var id = this.view.dataset.ids[this.view.dataset.index];
                        var values = {};
                        values[this.name] = state;
                        var context = openerp.instances.instance0.web.pyeval.eval(
                            'contexts', this.build_context());
                        var model = new openerp.instances.instance0.web.Model(this.view.model);
                        model.call('write', [[id], values],
                                   {'context': this.build_context()});
                        this.internal_set_value(state, {'silent': true});
                        this.getParent().datarecord[this.name] = state;
                    }
                }, this));
            this.on("change:readonly", this, this.switcher_states);
            this.setupFocus(this.$checkbox);
            this._super();
            this.switcher_states.call(this);
        },
        internal_set_value: function(value_, options) {
            var tmp = this.no_rerender;
            this.no_rerender = true;
            this.set({'value': value_}, options);
            this.no_rerender = tmp;
        },
        switcher_states: function () {
            this.switcher.set_readonly(this.get('readonly'));
            if (!this.switcher.quick_edit){
                this.switcher.set_disabled(this.get('effective_readonly'));
            }
        },
        render_value: function() {
            this.switcher.set_value(this.get('value'));
        },
        focus: function() {
            var input = this.$checkbox && this.$checkbox[0];
            return input ? input.focus() : false;
        },
    });

    // Helper methods
    function apply_switcher(view, columns){
        var switch_fields = columns.filter(function(c){
            return c.widget === 'boolean_switch';
        });
        switch_fields.forEach(function(field){
            var checkboxes;

            var options = field.options ? py.eval(field.options) : {};

            if(view.grouped){
                //Manage if it's grouped by boolean_switch widget field
                var opt = {};
                _.extend(opt, options);
                opt.disabled = true;
                checkboxes = view.$el.find(
                    'th.oe_list_group_name input[type="checkbox"]');
                new openerp.instances.instance0.web.BooleanSwitchWidget(
                    checkboxes, opt, null);
            }

            _.extend(options, field.modifiers ? field.modifiers : {});
            checkboxes = view.$el.find('td[data-field=' + field.name +
                '].oe_list_field_boolean_switch > input[type="checkbox"]');
            new openerp.instances.instance0.web.BooleanSwitchWidget(
                checkboxes, options, _.bind(function(event, state) {
                    var id = $(event.target).data('rowid');
                    var values = {};
                    values[this.field.name] = state;
                    var context = field.context ? py.eval(field.context) : {};
                    _.extend(context, view.session.user_context);
                    var model = new openerp.instances.instance0.web.Model(this.view.model);
                    model.call('write', [[id], values],
                       {'context': context}).then(_.bind(function(){
                            if(!this.view.grouped){
                                this.view.records._byId[this.id].attributes[
                                    this.field.name] = this.state;
                            }
                       }, {'view': this.view, 'field': this.field,
                           'id': id, 'state': state}));
                }, {'view': view, 'field': field})
            );
        });
    }

    // List view
    instance.web.list.columns.add('field.boolean_switch', 'instance.web.list.FieldBooleanSwitch');

    instance.web.list.FieldBooleanSwitch = instance.web.list.Column.extend({
        format: function (row_data, options) {
            options = options || {};
            var attrs = {};
            if (options.process_modifiers !== false) {
                attrs = this.modifiers_for(row_data);
            }
            if (attrs.invisible) { return ''; }

            if (!row_data[this.id]) {
                return options.value_if_empty === undefined ?
                    '' : options.value_if_empty;
            }
            var readonly = attrs.hasOwnProperty('readonly') ? attrs.readonly : false;
            return this._format(row_data, options, readonly);
        },

        _format: function (row_data, options, readonly) {
            options = options ? options : {};
            var autofocus = this.hasOwnProperty('autofocus') ?
                this.autofocus : false;
            var tabindex = this.hasOwnProperty('tabindex') ?
                parseInt(this.tabindex) : 0;
            return _.str.sprintf('<input type="checkbox" %s %s data-rowid="%d" %s %s/>',
                row_data[this.id].value ? 'checked="checked"' : '',
                readonly ? 'readonly' : '',
                row_data.hasOwnProperty('id') && _.isNumber(row_data.id.value) ?
                    row_data.id.value : -1,
                autofocus ? 'autofocus' : '',
                'tabindex="' + tabindex + '"');
        }
    });

    instance.web.ListView.Groups.include({
        render: function(post_render){
            var self = this;
            var prender = function(){
                apply_switcher(self.view, self.columns);
                if (post_render) { post_render(); }
            };
            return this._super(prender);
        },
    });

    instance.web.ListView.List.include({
        init: function(){
            //This is the case when on each line, a request to name_get
            //id done, this cause a record to be re-render though on change.
            //So we have to overide the events as I haven't found any good hooks
            this._super.apply(this, arguments);
            var self = this;
            this.records.unbind('change');
            this.record_callbacks.change = function (event, record, attribute, value, old_value) {
                var $row;
                if (attribute === 'id') {
                    if (old_value) {
                        throw new Error(_.str.sprintf( _t("Setting 'id' attribute on existing record %s"),
                            JSON.stringify(record.attributes) ));
                    }
                    self.dataset.add_ids([value], self.records.indexOf(record));
                    // Set id on new record
                    $row = self.$current.children('[data-id=false]');
                } else {
                    $row = self.$current.children(
                        '[data-id=' + record.get('id') + ']');
                }
                $row.replaceWith(self.render_record(record));
                self.afterRowChanged($row, record, attribute);
            };
            this.records.bind('change', this.record_callbacks.change);
        },
        afterRowChanged: function($row, record, attribute){
            apply_switcher(this.view, this.columns, $row);
        },
    });
    instance.web.ListView.include({
        reload_record: function(record){
            // in case of editable list, only update record is reloaded
            // after edition
            var self = this;
            return this._super(record).then(function(){
                apply_switcher(self, self.columns);
            });
        },
    });
};
