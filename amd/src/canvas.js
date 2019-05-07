// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * JS Canvas
 *
 * Tested in Moodle 3.5
 *
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 *
 * @package local_commander
 * @copyright 2018 MFreak.nl
 * @author    Luuk Verhoeven
 **/
/* global fabric */
/* eslint no-unused-expressions: "off", no-console:off, no-invalid-this:"off",no-script-url:"off" */

define(['jquery', 'core/notification'], function($, notification) {
    'use strict';

    /**
     * Possible options
     * @type {{id: number, debugjs: boolean, has_horizontal_ruler: boolean, background: string}}
     */
    var opts = {
        id: 0,
        debugjs: false,
        has_horizontal_ruler: true,
        background: '',
    };

    /**
     * Set options base on listed options
     * @param {object} options
     */
    var setOptions = function(options) {
        "use strict";
        var key, vartype;
        for (key in opts) {
            if (opts.hasOwnProperty(key) && options.hasOwnProperty(key)) {

                // Casting to prevent errors.
                vartype = typeof opts[key];
                if (vartype === "boolean") {
                    opts[key] = Boolean(options[key]);
                } else if (vartype === 'number') {
                    opts[key] = Number(options[key]);
                } else if (vartype === 'string') {
                    opts[key] = String(options[key]);
                }
                // Skip all other types.
            }
        }
    };

    /**
     * Console log debug wrapper.
     */
    var debug = {};

    /**
     * Local history/cache buffer
     * @type {number}
     */
    var buffer_step = 0;

    /**
     *
     * @type {number}
     */
    var buffer_timer = 0;

    /**
     * Should we store changes to localstorage
     * @type {boolean}
     */
    var buffer_active = true;

    /**
     * Set debug mode
     * Should only be enabled if site is in debug mode.
     * @param {boolean} isenabled
     */
    var setDebug = function(isenabled) {

        if (isenabled) {
            for (var m in console) {
                if (typeof console[m] == 'function') {
                    debug[m] = console[m].bind(window.console);
                }
            }
        } else {
            // Fake wrapper.
            for (var m in console) {
                if (typeof console[m] == 'function') {
                    debug[m] = function() {
                    };
                }
            }
        }
    };

    /**
     * Canvas holder.
     * @type fabric.Canvas
     */
    var canvas = null;

    /**
     * Module canvas wrapper.
     */
    var canvasModule = {

        /**
         * @type int
         */
        canvas_width: 800,

        /**
         * @type int
         */
        canvas_height: 500,

        /**
         * Default rectangle.
         */
        default_shape_rect: {
            width: 70,
            height: 70,
            left: 200,
            top: 50,
            angle: 0,
            fill: '#ffb628'
        },

        /**
         * Default circle.
         */
        default_shape_circle: {
            radius: 40,
            left: 200,
            top: 50,
            fill: '#b3cc2b'
        },

        /**
         * Default triangle.
         */
        default_shape_triangle: {
            top: 50,
            left: 200,
            width: 70,
            height: 70,
            fill: '#0081b4'
        },

        /**
         * Default text.
         */
        default_shape_textbox: {
            top: 50,
            left: 200,
            fill: '#0081b4'
        },

        /**
         * Load user there history.
         */
        loadHistory: function() {
            $.ajax({
                type: 'POST',
                url: M.cfg.wwwroot + '/mod/gcanvas/ajax.php',
                data: {
                    sesskey: M.cfg.sesskey,
                    action: 'load_history',
                    data: {
                        'id': opts.id,
                    }
                },
                dataType: "json",
                success: function(response) {
                    debug.log(response);
                    if (response.success) {
                        $('#history').html(response.html);
                    }
                },
                error: function(response) {
                    debug.error(response.responseText);
                    // Show a error messages.
                    notification.addNotification({
                        message: response.responseText,
                        type: "error"
                    });
                }
            });
        },

        /**
         *  Save the current canvas.
         */
        saveCanvasAjax: function() {
            // Canvas to image.
            // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
            if (!fabric.Canvas.supports('toDataURL')) {

                notification.addNotification({
                    message: 'This browser doesn\'t provide means to serialize canvas to an image',
                    type: "error"
                });

            } else {

                // Send data to AJAX.
                $.ajax({
                    type: 'POST',
                    url: M.cfg.wwwroot + '/mod/gcanvas/ajax.php',
                    data: {
                        sesskey: M.cfg.sesskey,
                        action: 'save_canvas',
                        data: {
                            'id': opts.id,
                            'status': 'final',
                            'canvas_data': canvas.toDataURL({
                                multiplier: 1,
                                format: 'png'
                            }),
                            'json_data': JSON.stringify(canvas)
                        }
                    },
                    dataType: "json",
                    success: function(response) {
                        debug.log(response);

                        if (response.success) {
                            notification.addNotification({
                                message: M.util.get_string('javascript:updated', 'mod_gcanvas'),
                                type: "success",
                            });

                            // Load attempts.
                            canvasModule.loadHistory();

                        } else {
                            notification.addNotification({
                                message: response.error,
                                type: "error"
                            });
                        }
                    },
                    error: function(response) {
                        debug.error(response.responseText);
                        // Show a error messages.
                        notification.addNotification({
                            message: response.responseText,
                            type: "error"
                        });
                    }
                });
            }
        },

        /**
         * Trash selected canvas items.
         */
        deleteSelectedCanvasItems: function() {
            try {
                var activeobjects = canvas.getActiveObjects();
                if (activeobjects.length) {

                    for (var i in activeobjects) {
                        if (activeobjects.hasOwnProperty(i)) {
                            var element = activeobjects[i];

                            if (element.id !== undefined && element.id === 'ruler') {
                                debug.log('Ruler: Not removable!');
                                continue;
                            }

                            canvas.remove(element);
                        }
                    }

                    canvas.discardActiveObject().renderAll();
                } else {
                    debug.log('Selection empty');
                }

            } catch (e) {
                debug.error('Nothing selected', e);
            }
        },

        /**
         * Dynamic method for selecting a shape.
         */
        loadDynamicToolbarMappingShapes: function() {

            $('#toolbar .icon[data-element-type]').on('click', function() {
                var el;
                var elementtype = $(this).data('element-type');

                try {
                    canvas.discardActiveObject();
                } catch (e) {
                    // If nothing is added to the canvas this gives a error.
                }

                var shape = "default_shape_" + elementtype.toLowerCase();
                debug.log("Search for shape: " + shape);

                if (canvasModule.hasOwnProperty(shape)) {
                    debug.log("Shape found");

                    if (elementtype === 'Textbox') {
                        el = new fabric[elementtype]('DEMO', canvasModule[shape]);
                    } else {
                        el = new fabric[elementtype](canvasModule[shape]);
                    }

                    canvas.add(el);
                    canvas.setActiveObject(el);
                } else {
                    debug.error('Shape not found!');
                }

                canvas.renderAll();
            });
        },

        /**
         * Colorpicker used for changing the color of a shape.
         */
        loadColorPicker: function() {
            $("#colorpicker").spectrum({
                showPalette: true,
                palette: [],
                showSelectionPalette: true, // true by default
                selectionPalette: ["red", "green", "blue", "orange"],
                flat: false,
                change: function(color) {
                    debug.log('change color');
                    canvasModule.setColor(color);
                }
            }).on("dragstart.spectrum , dragstop.spectrum", function(e, color) {
                    debug.log('change color - dragstop - dragstart');
                    canvasModule.setColor(color);
                }
            );
        },

        /**
         * Using svg making sure it looks nice.
         *
         * @param src
         */
        loadEmojiCsv: function(src) {
            debug.log('loadEmojiCsv : ', src);
            // Issue when using loadsvgfromurl.
            fabric.Image.fromURL(src.replace('.png', '.svg'), function(object) {
                // Logic below needed to work with the svg files.
                object.set({
                    height: 500,
                    width: 500,
                    left: 150,
                    top: 100,
                    angle: 0,
                    centerTransform: true
                }).scale(0.4).setCoords();
                canvas.add(object);
                canvas.setActiveObject(object);
            });
        },

        /**
         * Delete a attempt/sketch
         *
         * @param {jQuery} $el
         */
        deleteAttempt: function($el) {
            //TODO we could better use amd Ajax helper Moodle and external webservice, for now this is okay.

            debug.log('Delete', $el);
            notification.confirm(
                M.util.get_string('javascript:confirm_title', 'mod_gcanvas'),
                M.util.get_string('javascript:confirm_desc', 'mod_gcanvas'),
                M.util.get_string('javascript:yes', 'mod_gcanvas'),
                M.util.get_string('javascript:no', 'mod_gcanvas'), function() {

                    $.ajax({
                        type: 'POST',
                        url: M.cfg.wwwroot + '/mod/gcanvas/ajax.php',
                        data: {
                            sesskey: M.cfg.sesskey,
                            action: 'delete_attempt',
                            data: {
                                'id': opts.id,
                                'attempt_id': $el.data('id'),
                            }
                        },
                        dataType: "json",
                        success: function(response) {
                            debug.log(response);

                            if (response.success) {
                                // Load attempts.
                                canvasModule.loadHistory();

                            } else {
                                notification.addNotification({
                                    message: response.error,
                                    type: "error"
                                });
                            }
                        },
                        error: function(response) {
                            debug.error(response.responseText);
                            // Show a error messages.
                            notification.addNotification({
                                message: response.responseText,
                                type: "error"
                            });
                        }
                    });
                });
        },

        /**
         * Restore a attempt/sketch
         *
         * @param {jQuery} $el
         */
        restoreAttempt: function($el) {
            debug.log('Restore', $el);
            $.ajax({
                type: 'POST',
                url: M.cfg.wwwroot + '/mod/gcanvas/ajax.php',
                data: {
                    sesskey: M.cfg.sesskey,
                    action: 'get_attempt',
                    data: {
                        'id': opts.id,
                        'attempt_id': $el.data('id'),
                    }
                },
                dataType: "json",
                success: function(response) {
                    debug.log(response);

                    if (response.success) {
                        buffer_active = false;

                        canvas.loadFromJSON(response.record.json_data, canvas.renderAll.bind(canvas));

                        setTimeout(function() {
                            buffer_active = true;
                        }, 1000);
                    }
                }
            });
        },

        /**
         * Show the fileuploader.
         *
         * @param filearea
         */
        showFileuploader: function(filearea) {
            $('#canvas-filepicker-form-' + filearea).toggle();
        },

        /**
         * Set background of the canvas.
         */
        setBackgroundImage: function() {

            if (opts.background !== '') {
                fabric.Image.fromURL(opts.background, function(img) {
                    // add background image
                    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                        scaleX: canvas.width / img.width,
                        scaleY: canvas.height / img.height
                    });
                });
            }
        },

        /**
         * addUserImage
         */
        addUserImage: function() {
            var formdata = {'id': opts.id,};
            var inputs = $('#canvas-filepicker-form-student_image form').serializeArray();

            $.each(inputs, function(i, input) {
                formdata[input.name] = input.value;
            });

            $.ajax({
                type: 'POST',
                url: M.cfg.wwwroot + '/mod/gcanvas/ajax.php',
                data: {
                    sesskey: M.cfg.sesskey,
                    action: 'upload_images',
                    data: formdata
                },
                dataType: "json",
                success: function(response) {
                    debug.log(response);

                    if (response.success) {
                        canvasModule.addImageFromUrl(response.image);
                    }
                    $('#canvas-filepicker-form-student_image').hide();
                }
            });
        },

        /**
         *
         * @param path
         */
        addImageFromUrl: function(path) {

            //TODO SVG support.

            fabric.Image.fromURL(path, function(object) {
                object.set({
                    left: 150,
                    top: 100,
                    angle: 0,
                    centerTransform: true
                }).setCoords();

                // Prevent to large objects.
                var maxwidth = canvas.getWidth() / 3;

                if (object.width > maxwidth) {
                    object.scaleToWidth(maxwidth);
                }

                canvas.add(object);
                canvas.setActiveObject(object);
            });
        },

        /**
         *
         */
        selectToolbarImage: function() {
            var dialog = $('#image-picker');
            if (dialog.is(':visible')) {
                dialog.hide();
                return;
            }
            dialog.show();

            $.ajax({
                type: 'POST',
                url: M.cfg.wwwroot + '/mod/gcanvas/ajax.php',
                data: {
                    sesskey: M.cfg.sesskey,
                    action: 'get_toolbar_images',
                    data: {
                        'id': opts.id,
                    }
                },
                dataType: "json",
                success: function(response) {
                    debug.log(response);

                    if (response.success) {
                        var html = '<ul class="list-group">';
                        $.each(response.images, function(i, src) {
                            html += '<li class="toolbar-image" rel="' + i + '"><img  alt="" src="' + src + '" ' +
                                'class="img-thumbnail"></li>';
                        });
                        html += '</ul>';

                        dialog.html(html);
                    }
                }
            });
        },

        /**
         * Undo 1 canvas step
         */
        undo: function() {

            if (buffer_step === 0) {
                return;
            }
            try {
                var data = localStorage.getItem('buffer_' + buffer_step);
                canvas.loadFromJSON(data, canvas.renderAll.bind(canvas));

                localStorage.removeItem('buffer_' + buffer_step);

                buffer_step--;
            } catch (e) {
                debug.log(e);
            }
        },

        /**
         * Toolbar actions.
         */
        loadToolbar: function() {

            this.setBackgroundImage();

            // Most shapes will be placed on canvas by this function.
            this.loadDynamicToolbarMappingShapes();

            // Color picker.
            this.loadColorPicker();

            // Clear canvas items.
            $('#clear').on('click', function() {
                canvas.clear();

                if (opts.has_horizontal_ruler) {
                    canvasModule.addHorizontalRuler();
                }

                canvasModule.setBackgroundImage();
            });

            // Arrow.
            $('#arrow i').on('click', function() {
                canvasModule.loadArrowToCanvas();
            });

            // Remove selected items.
            $('#trash i').on('click', function() {
                canvasModule.deleteSelectedCanvasItems();
            });

            // Load emoji picker.
            $('#smiley i').on('click', function() {
                canvasModule.loadEmojiPicker();
            });

            $('#undo').on('click', function() {
                buffer_active = false;
                canvasModule.undo();

                setTimeout(function() {
                    buffer_active = true;
                }, 500);
            });

            // Add own image to the canvas.
            $('#add-image i').on('click', function() {
                canvasModule.showFileuploader('student_image');
            });

            // Student selecting a image, added to the toolbar by teachers.
            $('#select-a-image i').on('click', function() {
                canvasModule.selectToolbarImage();
            });

            $('#image-picker ').on('click', 'img', function() {
                canvasModule.addImageFromUrl($(this).attr('src'));
                $('#image-picker').hide();
            });

            $('#save-canvas').on('click', function() {
                canvasModule.saveCanvasAjax();
            });

            $('#show-help').on('click', function() {
                $('#dialog-help').show();
            });

            $('#dialog-help').on('click', function() {
                $('#dialog-help').hide();
            });

            $('#history').on('click', '.delete', function(e) {
                e.preventDefault();
                canvasModule.deleteAttempt($(this));

            }).on('click', '.restore', function(e) {

                e.preventDefault();
                canvasModule.restoreAttempt($(this));

            });

            // Dialog to selected a emoji.
            $('#emoji-picker').on('click', 'img', function() {
                canvasModule.loadEmojiCsv($(this).attr('src'));
                $('#emoji-picker').hide();
            });

            // Teacher background.
            $('#change_background').on('click', function() {
                canvasModule.showFileuploader('background');
            });

            // Teacher image.
            $('#add_toolbar_images').on('click', function() {
                canvasModule.showFileuploader('toolbar_shape');
            });

            $('#canvas-filepicker-form-student_image').on('click', '#id_submitbutton', function(e) {
                e.preventDefault();

                // Form should be posted to AJAX call so we can get the image.
                canvasModule.addUserImage();
            });

            // Hide pressing on cancel.
            $('.dialog').on('click', '.btn-secondary', function(e) {
                e.preventDefault();
                debug.log('Cancel');
                $('.dialog').hide();
            });
        },

        /**
         * Emoji dialog
         */
        loadEmojiPicker: function() {
            var $picker = $('#emoji-picker');
            if ($picker.html() !== '') {
                debug.log('Toggle emoji');
                $picker.toggle();
                return;
            }

            $.ajax({
                type: 'POST',
                url: M.cfg.wwwroot + '/mod/gcanvas/ajax.php',
                data: {
                    sesskey: M.cfg.sesskey,
                    action: 'emoji',
                    data: {
                        'id': opts.id,
                    }
                },
                dataType: "json",
                success: function(response) {
                    debug.log(response);

                    if (response.success) {
                        $picker.html(response.html).show();
                    }
                }
            });
        },

        /**
         * Load the arrow icon to the canvas.
         */
        loadArrowToCanvas: function() {
            fabric.loadSVGFromURL('pix/arrow.svg', function(objects, options) {
                var obj = fabric.util.groupSVGElements(objects, options);
                canvas.add(obj.scale(0.1)).centerObject(obj).renderAll();
                obj.setCoords();
                canvas.setActiveObject(obj);
            });
        },

        /**
         * Set active element colors.
         * @param color
         */
        setColor: function(color) {

            var colorhex = color.toHexString(); // #ff0000
            var activeobjects = canvas.getActiveObjects();
            if (activeobjects) {

                for (var i in activeobjects) {
                    if (activeobjects.hasOwnProperty(i)) {
                        var element = activeobjects[i];

                        if (element.hasOwnProperty('id') && element.id === 'ruler') {
                            continue;
                        }

                        element.set("fill", colorhex);
                    }
                }

                canvas.renderAll();
            } else {
                debug.log('No active items');
            }
        },

        /**
         * Don't allow going out of canvas.
         */
        preventMovingOutOfCanvas: function() {
            canvas.on('object:moving', function(e) {
                var obj = e.target;
                // if object is too big ignore
                if (obj.currentHeight > obj.canvas.height || obj.currentWidth > obj.canvas.width) {
                    return;
                }
                obj.setCoords();

                if (obj.getBoundingRect().top < 0 || obj.getBoundingRect().left < 0) {
                    obj.top = Math.max(obj.top, obj.top - obj.getBoundingRect().top);
                    obj.left = Math.max(obj.left, obj.left - obj.getBoundingRect().left);
                }

                if (obj.getBoundingRect().top + obj.getBoundingRect().height > obj.canvas.height ||
                    obj.getBoundingRect().left + obj.getBoundingRect().width > obj.canvas.width) {
                    obj.top = Math.min(obj.top, obj.canvas.height - obj.getBoundingRect().height + obj.top -
                        obj.getBoundingRect().top);
                    obj.left = Math.min(obj.left, obj.canvas.width - obj.getBoundingRect().width + obj.left -
                        obj.getBoundingRect().left);
                }
            });
        },

        /**
         * Trigger for extra keyboard commands.
         */
        keyboardActions: function() {
            $(document).keydown(function(e) {
                debug.log('keypress', e.which);
                switch (e.which) {
                    case 46:
                        canvasModule.deleteSelectedCanvasItems();
                        break;
                }
            });
        },

        /**
         * Start this module.
         */
        init: function() {

            // Load canvas.
            this.__canvas = canvas = new fabric.Canvas('sketch');

            // Prevent right click.
            $('body').on('contextmenu', 'canvas , img', function() {
                return false;
            });

            // fabric.Object.prototype.transparentCorners = false;
            // fabric.Object.prototype.originX = fabric.Object.prototype.originY = 'center';

            // Dimensions.
            canvas.setHeight(this.canvas_height);
            canvas.setWidth(this.canvas_width);

            // Catch some actions.
            canvas.on({
                'selection:created': this.onchange,
                'selection:updated': this.onchange,

                //  'object:moving' : this.add_to_history,
                'object:added': this.add_to_cache,
                'object:removed': this.add_to_cache,
                'object:modified': this.add_to_cache,
            });

            // Make sure we start with a empty storage.
            localStorage.clear();

            this.preventMovingOutOfCanvas();

            this.loadToolbar();

            if (opts.has_horizontal_ruler) {
                this.addHorizontalRuler();
            }

            this.loadHistory();

            this.keyboardActions();
        },

        /**
         * Keep a history/cache buffer.
         */
        add_to_cache: function() {
            debug.log('history');
            canvasModule.addCanvasToCacheBuffer();
        },

        /**
         * Add canvas to local storage.
         */
        addCanvasToCacheBuffer: function() {
            // When undo there lot of modified events we doesnt want to trigger if thats the case.
            if (!buffer_active) {
                return;
            }

            clearTimeout(buffer_timer);
            setTimeout(function() {
                try {
                    buffer_step++;
                    localStorage.setItem('buffer_' + buffer_step, JSON.stringify(canvas));
                } catch (e) {
                    debug.log(e);
                }
            }, 500);
        },

        /**
         * Horizontal ruler.
         */
        addHorizontalRuler: function() {
            var ruler = new fabric.Rect({
                width: this.canvas_width,
                height: 2,
                id: 'ruler',
                left: 0,
                top: 410,
                angle: 0,
                fill: '#8b58a1'
            });

            ruler.flipY = false;
            ruler.lockMovementX = true;
            ruler.lockScalingX = true;
            ruler.lockScalingY = true;
            ruler.lockUniScaling = true;
            ruler.lockRotation = true;

            canvas.add(ruler);
            canvas.renderAll();

            // Keyboard arrows move ruler.
            $(document).keydown(function(e) {
                switch (e.which) {

                    case 38: // Up arrow.
                        ruler.top = ruler.top - 10;
                        canvas.renderAll();
                        break;

                    case 40: // Down arrow.
                        ruler.top = ruler.top + 10;
                        canvas.renderAll();

                        break;

                    default:
                        return; // Exit this handler for other keys.
                }
                e.preventDefault(); // Prevent the default action (scroll / move caret).
            });
        },

        /**
         * Trigger on canvas element actions.
         * @param options
         */
        onchange: function(options) {
            if (options.target.hasOwnProperty('id') && options.target.id === 'ruler') {
                return;
            }

            $("#colorpicker").spectrum("set", options.target.fill);
        }
    };

    return {

        /**
         * Init.
         */
        initialise: function(args) {

            // Load spectrum javascript form here.
            $.getScript("/mod/gcanvas/javascript/spectrum.js").done(function() {

                // Load the args passed from PHP.
                setOptions(args);

                // Set internal debug console.
                setDebug(opts.debugjs);

                $.noConflict();
                $(document).ready(function() {
                    debug.log('Canvas Module v1.1');
                    canvasModule.init();
                });
            });
        }
    };
});