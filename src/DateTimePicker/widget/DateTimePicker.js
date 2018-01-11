/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console */
/*mendix */

define([
    'dojo/_base/declare',
    'mxui/widget/_WidgetBase',
    'dijit/_TemplatedMixin',
    'mxui/dom',
    'dojo/dom',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/_base/lang',
    'dojo/_base/config',
    'dojo/text',
    'dojo/html',
    "dojo/_base/array",
    "dojo/_base/kernel",
    'DateTimePicker/lib/jquery-2.1.4',
    'DateTimePicker/lib/moment-with-locales',
    'DateTimePicker/lib/bootstrap-datetimepicker',
    'dojo/text!DateTimePicker/widget/template/DateTimePicker.html'
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, domAttr, domClass, domConstruct, lang, config, text, dojoHtml, dojoArray, kernel, _jQuery, moment, datetimepicker, widgetTemplate) {
    'use strict';
    
    var $ = _jQuery.noConflict(true);

    return declare('DateTimePicker.widget.DateTimePicker', [_WidgetBase, _TemplatedMixin], {
        templateString: widgetTemplate,

        // Mx widget attributes
        _wgtNode:       null,
        _contextGuid:   null,
        _contextObj:    null,
        _handles:       [],
        _hasStarted:    false,
        
        // DateTimePicker specific attributes
        inputBox        : null,
        relativeNode    : null,
        pickerControl   : null,
        currentValue    : '',
        
        isInactive      : false,
        lang            : 'en',
        format          : '',
        onchangemf      : null,
        localizedFormat : null,
        
        closeButton 		: false,
        clearButton 		: false,
        toolbarPlacement: 'default',

        postCreate: function () {
            console.log(this.id + ".postCreate");
            
            if (this._hasStarted)
                return;

            this._hasStarted = true;

            // Set moment Js locale based on current session locale
            var mxLocale = kernel.locale;

            switch(mxLocale){
                case "nl-nl":
                    this.locale = 'nl';
                    break;
                case "de-de":
                    this.locale = 'de';
                    break;
            } 
            
            // set localized formatting (from dojoConfig)
            this.localizedFormat = null;
            
            if (config.localizedMomentJSFormats) { // This does not exist in dojo and so may not be used
                config.localizedMomentJSFormats.forEach(lang.hitch(this, function(format) {
                    if (format.locale == mxLocale) {
                        this.localizedFormat = format;
                    }
                }));
            }
            
            domClass.add(this.domNode, 'DateTimePickerWidget');
            domAttr.set(this.domNode, 'tabIndex', '-1'); 
            
            // set format
            if (this.localizedFormat != null) {
                if (this.enabledate && this.enabletime) {
                    this.format += this.localizedFormat.datetime;
                } else if (this.enabledate && !this.enabletime) {
                    this.format += this.localizedFormat.date;
                } else {
                    this.format += this.localizedFormat.time;
                }
                if (this.enabletime && this.showseconds) {
                    this.format += ':ss';
                }
            } else {
                if (this.enabledate) {
                    this.format += 'l ';
                }
                
                if (this.enabletime) {
                    this.format += 'LT';
                }
                
                if (this.enabletime && this.showseconds) {
                    this.format += 'S';
                }
            }
            
            if (this.customformat != '') {
                domAttr.set(this.relativeNode, 'data-date-format', this.customformat);
                this.format = this.customformat;
            }

            this.renderPicker();
            
            this._setupEvents();

        },

        startup : function(){
            console.log(this.id + ".startup");
                        
        },

        renderPicker : function () {
            console.log(this.id + ".renderPicker");
            /* [Story 809088] -- added properties "showClose", "showClear", "toolbarPlacement", "icons" */
            $(this.relativeNode).datetimepicker({
                format:         this.format,
                useCurrent:     this.setcurrent,
                stepping:       this.minutesteps,
                locale:         this.locale,
                useStrict:      true,
                widgetParent:   $('.input-group.date'),
                widgetPositioning: {
                    horizontal: 'left',
                    vertical: 'auto'
                },
                icons: {
                	close: 'glyphicon glyphicon-ok'
                },
                showClose:			this.closeButton,
                showClear:			this.clearButton,
                toolbarPlacement: this.toolbarPlacement ? this.toolbarPlacement : "bottom"
            });
			
						var enabled;
						
						if (this.enabledattr) {
							if (this._contextObj !== null) {
								enabled = this._contextObj.get(this.enabledattr);	
							} else {
								enabled = this.enabled;
							}
						} else {
							enabled = this.enabled;
						}
						
						if (!enabled) $(this.relativeNode).data("DateTimePicker").disable();
						
				    $(this.relativeNode).on("dp.show", lang.hitch(this, function() {
				        var widget = $('.bootstrap-datetimepicker-widget');
				        // var top = ($(this.relativeNode).bottom);
				        // var left = $(this.relativeNode).margin-left;
				        // if($(this.relativeNode).offset().top - 400 <= 0) { //display below if not enough room above
				        //     // top = $(this.relativeNode).offset().top+$(this.relativeNode).height()+10;
				        //     widget.removeClass('top');
				        //     widget.addClass('bottom');
				        // } else {
				        //     widget.addClass('top');
				        //     widget.removeClass('bottom');
				        // }
				        
				        widget.css(
				        {
				            'left': 0
				        });
				        this._clearValidations;
				    } ));
				
				    // Fix where bootstrap-datetimepicker show calendar glyph for time-only picker
				    if (!this.enabledate) {
				        $(this.handle).removeClass('glyphicon-calendar');
				        $(this.handle).addClass('glyphicon-time');
				    }
				
				    // Fix where Chrome does not stretch relativeNode to 100%
				    if (!!window.chrome) $(this.relativeNode).css("width","100%");
        },

        update: function(obj, callback) {
            console.log(this.id + ".update");

            this._contextObj = obj;
            
            if (this._contextObj !== null) {
                var objValue = this._contextObj.get(this.attribute);
                var objDateValue;
                
                if (objValue !== null) {
                    objDateValue = new Date(objValue);
                }
                
                if (!this.currentValue) {
                    this.currentValue = objValue;
                    this._updatePicker();
                }
            } else {
                $(this.relativeNode).data("DateTimePicker").disable();
            }
            
            this._resetSubscriptions();

            callback();
        },

        _updatePicker : function() {
            console.log(this.id + "._updatePicker");
            
            this._clearValidations();
            
            if (this.currentValue !== null && this.currentValue !== '') {
                var newValue = new Date(this.currentValue);
                $(this.relativeNode).data("DateTimePicker").date(newValue);
            } else {
                $(this.relativeNode).data("DateTimePicker").clear();
            }
            
        },
        
        _updateFromObject : function() {
            console.log(this.id + "._updateFromObject");
            
            this._clearValidations();
            
            if (this._contextObj !== null) {
                var objValue = this._contextObj.get(this.attribute);
                
                if (this.currentValue !== objValue) {
                    this.currentValue = objValue;
                    this._updatePicker();
                }
            }
            
        },
        
        _updateFromPicker : function(date, oldDate) {
            console.log(this.id + "._updateFromPicker");
            
            if(date === false) date = '';
            if (date != '') {
                var selectedDate = date.toDate();
                
                if (this.currentValue.valueOf() != selectedDate.valueOf()) {
                    this.currentValue = selectedDate;
                    this._contextObj.set(this.attribute, this.currentValue);
                    mx.data.commit({
                        mxobj: this._contextObj,
                        callback: function() {}
                    });
                    this.execmf();                    
                }
            } else {
                if (this.currentValue.valueOf() !== null) {
                    this.currentValue = '';
                    this._contextObj.set(this.attribute, this.currentValue);
                    mx.data.commit({
                        mxobj: this._contextObj,
                        callback: function() {}
                    });
                    this.execmf();  
                }
            }
        },

        _setupEvents: function () {
            
            $(this.relativeNode).on("dp.change", lang.hitch(this, function(e) {
                this._updateFromPicker(e.date, e.olddate);
            }));
            
        },
        
        // Handle validations.
        _handleValidation: function(validations) {
            lang.hitch(this, function() { this._clearValidations(); });

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.attribute);

            if (this.readOnly) {
                validation.removeAttribute(this.attribute);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.attribute);
            }
        },

        // Clear validations.
        _clearValidations: function() {
            domClass.remove(this.domNode, 'has-error');
            domConstruct.destroy(this._alertDiv);            
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function(message) {
            domClass.add(this.domNode, 'has-error');
            if (this._alertDiv) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = domConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            domConstruct.place(this._alertDiv, this.domNode);
        },

        // Add a validation.
        _addValidation: function(message) {
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function() {
            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function (handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions. 
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function(guid) {
                        this._updateFromObject();
                    })
                });

                var attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.attribute,
                    callback: lang.hitch(this, function(guid, attr, attrValue) {
                        this._updateFromObject();
                    })
                });

                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });

                this._handles = [ objectHandle, attrHandle, validationHandle ];
            }
        },

        execmf: function () {
            if (!this._contextObj) {
                return;
            }

            if (this.onchangemf) {
                mx.data.action({
                    store: {
                       caller: this.mxform
                    },
                    params: {
                        actionname: this.onchangemf,
                        applyto: 'selection',
                        guids: [this._contextObj.getGuid()]
                    },
                    callback: function () {
                        // ok
                    },
                    error: function () {
                        // error
                    }

                });
            }
        }

    });
});
require(['DateTimePicker/widget/DateTimePicker']);
