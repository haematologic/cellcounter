/*global $:false, jQuery:false */
var abnormal = false;
var keyboard_active = false;
var img_displayed = false;
var doughnut = {};
var pie = {};
var arc = {};
var cell_types = {};
var size = 200;
var editing_keyboard = false;
var edit_cell_id = -1;
var selected_element = {};
var date_now = new Date(Date.now()).toISOString();
var keyboard_map = {"label": "Default", "is_primary": true, "created": date_now,
                    "last_modified": date_now, "mappings": []};
var key_history = [];
var count_data = [];
var chart, chart2;


/* Populate count_data global array with initial data */

function populate_cell_types() {
    "use strict";

    /* Loads an empty count_data array */
    var cell_order = ['blasts','promyelocytes','myelocytes','meta','neutrophils','monocytes','basophils',
        'eosinophils','lymphocytes','plasma_cells','erythroid','other','lymphoblasts'];

    for (var i=0; i < cell_order.length; i++) {
        for (var cell in cell_types) {
            if (cell_types.hasOwnProperty(cell)) {
                if (cell_types[cell].machine_name === cell_order[i]) {
                    count_data.push({id: cell_types[cell].id,
                    count: 0,
                    abnormal: 0,
                    visualisation_colour: cell_types[cell].visualisation_colour,
                    readable_name: cell_types[cell].readable_name,
                    machine_name: cell_types[cell].machine_name});
                }
            }
        }
    }
}

var celltypes_loading = $.getJSON("/api/cell_types/", function(data) {
    /* Load cell_types object, and create and load new count_data object
     * provides error message should loading of data fail. */
    "use strict";
    cell_types = {};
    $.each(data, function(key, cell) {
        cell.box = [];
        cell_types[cell.id] = cell;
    });})
    //.done(function() {
    //    populate_count_data();
    //})
    .fail(function() {
        "use strict";
        add_alert('ERROR', 'Cellcountr failed to load cell data. Please refresh page');
    });

$(document).ready(function() {
    "use strict";
    var i, j, k;

    // Initialise doughnut chart visualisation
    chart = doughnutChart('#doughnut').data(count_data);
    chart2 = doughnutChart('#doughnut2').data(count_data);

    $('.keyboard-label').editable({
        url: function(params) {
            var keyboard = load_keyboard(params.pk);
            keyboard.label = params.value;
            save_keyboard(keyboard);
        }
    });

    $('#save_new_name').click(function() {
        save_new_keyboard($('#keyboard-name-input').val());
    });
    // Re-enable keyboard when dialog is closed
    $('#keyboard_name').on('hide', function () {
        editing_keyboard = true;
        keyboard_active = true;
    });

    $('#select_button').on('click', function() {
        $("#select-keyboard").modal("show");
    });

    $('#select-keyboard').on('show', function() {
        $.getJSON("/api/keyboards/", function(data) {
            $('#keyboard_list tbody > tr').remove();
            $.each(data, function(i, data) {
                $('#keyboard_list table tbody').append(
                    '<tr><td>'+data.label+'</td><td><span class="btn btn-success load_keyboard" title="Select keyboard" data-id="' + data.id + '"><i class="icon-ok icon-white"></i></span></td></tr>');
            });
            $('.load_keyboard').on('click', function() {
                var id = ($(this).attr('data-id'));
                set_keyboard(load_keyboard(id));
                $('#select-keyboard').modal("hide");
                $("div#editkeymapbox").dialog("close");
            });
        });
    });

    $.when(celltypes_loading).done(function() {
        /* Populate cell_types */
        populate_cell_types();

        /* Once cell_types has been populated successfully, load keyboard */
        load_keyboard();
    });

    /* Register button callbacks */
    register_keyboard_callbacks();

    $('#openkeyboard').on('click', open_keyboard);

    register_reset_callbacks();

    $('#fuzz, #close_button').click(function () {

        close_keyboard();
    });

    //Adjust height of overlay to fill screen when browser gets resized
    $(window).bind("resize", function (){
        $("#fuzz").css("height", $(document).height());
        //$("#total").text($("#counterbox").width());
        //$("#fuzz").css("top", $(window).top());

        if (keyboard_active) {
            resize_keyboard($("div#content").width());
        }
    });

    jQuery(document).bind('keydown', function (e) {
        var key, code, shift_pressed, el, enter=false;
        var alpha = false, up = false, down = false;

        if (keyboard_active) {
            key = String.fromCharCode(e.which).toUpperCase();
            code = e.which;
            shift_pressed = e.shiftKey;

            if (/[a-z]/i.test(key) && !shift_pressed) {
                alpha = true;
            }
            if (code === 188) {
                key = ","; // XXX: WTF
            }
            if (code === 173) {
                key = "-"; // XXX: WTF
            }
            if (key === " ") {
                abnormal = true;
                return false;
            }
            else if (code === 13) {
                enter = true;
            }
            else if(code === 38) {
                up = true;
            }
            else if(code === 40) {
                down = true;
            }

            if(editing_keyboard) {
                if (enter) {
                    deselect_element(selected_element);
                    select_element(selected_element.next());
                    return;
                }
                else if (down) {
                    deselect_element(selected_element);
                    select_element(selected_element.next());
                    return false;
                }
                else if (up) {
                    deselect_element(selected_element);
                    el = selected_element.prev();
                    if (!$(el).html()) {
                        el = $("div#celllist").find("li").last();
                    }
                    select_element(el);
                    return false;
                } else if (alpha) {
                    if (cell_types.hasOwnProperty(edit_cell_id.toString())) {
                        if($("#multi_key").is(':checked')) {
                            /* DENIES ABILITY TO MAP MULTIPLE KEYS TO THE SAME CELL TYPE
                             * Iterate through all key mappings, looking for any which map to the current cell_id.
                             * If found, delete them. N.B. we decrement the iterator if we've spliced to avoid
                             * issues with the length of the array and correct iteration position.
                             */
                            for (i = 0; i < keyboard_map.mappings.length; i++) {
                                if (keyboard_map.mappings[i].cellid.toString() === edit_cell_id) {
                                    keyboard_map.mappings.splice(i, 1);
                                    i--;
                                }
                            }
                            /* Remove any previous mappings for the key we're trying to add - prevents assigning
                             * two celltypes to a given key.
                             */
                            for (i = 0; i < keyboard_map.mappings.length; i++) {
                                if (keyboard_map.mappings[i].key === key.toLowerCase()) {
                                    keyboard_map.mappings.splice(i, 1);
                                    i--;
                                }
                            }

                            /* Add the new mapping for this keypress */
                            keyboard_map.mappings.push({'cellid': parseInt(edit_cell_id), 'key': key.toLowerCase()});

                            if($("#auto_advance").is(':checked')) {
                                deselect_element(selected_element);
                                select_element(selected_element.next());
                            }

                        } else {
                            /* We allow multiple mappings to the same cell_id , here we check if the key has been
                             * previously mapped, and if so, we remove any mappings for that key.
                             */
                            for (i = 0; i < keyboard_map.mappings.length; i++) {
                                if (keyboard_map.mappings[i].key === key.toLowerCase()) {
                                    keyboard_map.mappings.splice(i, 1);
                                    i--;
                                }
                            }

                            /* Add the new mapping */
                            keyboard_map.mappings.push({'cellid': parseInt(edit_cell_id), 'key': key.toLowerCase()});

                            /* Now we need to check that we have indeed mapped a key. If we haven't, it means we are
                             * creating a new map for a previously unmapped key, and therefore should just insert it
                             * into the mappings array.
                             */
                            var is_mapped = false;
                            for (i = 0; i < keyboard_map.mappings.length; i++) {
                                if (keyboard_map.mappings[i].key === key.toLowerCase() &&
                                    keyboard_map.mappings[i].cellid.toString() === edit_cell_id) {
                                    is_mapped = true;
                                }
                            }
                            if (is_mapped === false) {
                                keyboard_map.mappings.push({'cellid': parseInt(edit_cell_id), 'key': key.toLowerCase()});
                            }

                            if($("#auto_advance").is(':checked')) {
                                deselect_element(selected_element);
                                select_element(selected_element.next());
                            }
                        }
                        update_keyboard();
                    }
                }
                return;
            }

            if (shift_pressed) {
                /* We now show the image overlay to the user with the selected celltype images */
                for (i = 0; i < keyboard_map.mappings.length; i++) {
                    if (keyboard_map.mappings[i].key.toUpperCase() === key) {
                        var cell_id = keyboard_map.mappings[i].cellid;
                        var slug = cell_types[cell_id].machine_name;
                        var fullname = cell_types[cell_id].readable_name;

                        var $dialog = $('<div></div>')
                            .load('/images/celltype/'+slug+'/')
                            .dialog({
                                autoOpen: false,
                                title: fullname,
                                width: 900,
                                height: 700
                            });
                        /* Close any open dialogues before opening*/
                        $(".ui-dialog-content").dialog("close");
                        $dialog.dialog('open');
                        /* No further need to iterate through list */
                        break;
                    }
                }

            } else if (img_displayed) {
                $("div#imagebox").css("display", "none");
                img_displayed = false;
                return;
            }

            if (key === '1') {
                /* Show percentage view, note e.which is not working due to keypress issues */
                var show_total = 0;

                for (i=0; i < count_data.length; i++) {
                    show_total += (count_data[i].count + count_data[i].abnormal);
                }

                for (i=0; i< count_data.length; i++) {
                    for (j=0; j< cell_types[count_data[i].id].box.length; j++) {
                        $(cell_types[count_data[i].id].box[j]).find("span.countval").text(
                            Math.floor((count_data[i].count + count_data[i].abnormal)/show_total * 100) + "%");
                        $(cell_types[count_data[i].id].box[j]).find("span.abnormal").text("");
                    }
                }
            }

            if (code === 8) {
                /* Time to remove the key from the key_history and decrement count
                *  Last key should be an array containing:
                *  {c_id:n, c_type:normal/abnormal} */
                e.preventDefault();
                var last_key = key_history.pop();
                if (typeof last_key !== "undefined") {
                    var c_id = last_key.c_id;
                    var c_type = last_key.c_type;

                    for (i=0; i < count_data.length; i++) {
                        if (count_data[i].id === c_id) {
                            if (count_data[i][c_type] > 0 ) {
                                count_data[i][c_type]--;
                            }
                            var span_field = "span." + c_type;
                            if (span_field === "span.count") {
                                span_field += "val";
                                for (j=0; j<cell_types[c_id].box.length; j++){
                                    $(cell_types[c_id].box[j]).find(span_field).text(count_data[i][c_type]);
                                }
                            }
                            if (span_field === "span.abnormal") {
                                for (j=0; j<cell_types[c_id].box.length; j++){
                                    $(cell_types[c_id].box[j]).find(span_field).text("("+count_data[i][c_type]+")");
                                }
                            }
                        }
                    }
                } else {
                    /* Nothing to delete */
                    key_history = [];
                }
            } else {
                for (i = 0; i < keyboard_map.mappings.length; i++) {
                    if (keyboard_map.mappings[i].key.toUpperCase() === key && !(shift_pressed)) {
                        var id = keyboard_map.mappings[i].cellid;

                        // Add highlighting to keyboard
                        // Remove all currently active highlights (stops a queue developing)
                        for (j=0; j<cell_types[id].box.length; j++){
                            $(cell_types[id].box[j]).stop(true, true).css("background-color", '#ffffff');
                        }

                        // Add highlight to typed key
                        $(cell_types[id].box).effect("highlight", {}, 200);

                        if (abnormal === true) {
                            for (j = 0; j < count_data.length; j++) {
                                if (count_data[j].id === id) {
                                    count_data[j].abnormal++;
                                    for (k = 0; k< cell_types[id].box.length; k++) {
                                        $(cell_types[id].box[k]).find("span.abnormal").text("("+count_data[j].abnormal+")");
                                    }
                                }
                            }
                            key_history.push({c_id: id, c_type: 'abnormal'});
                        } else {
                            for (j = 0; j < count_data.length; j++) {
                                if (count_data[j].id === id) {
                                    count_data[j].count++;
                                    for (k = 0; k < cell_types[id].box.length; k++) {
                                        $(cell_types[id].box[k]).find("span.countval").text(count_data[j].count);
                                    }
                                }
                            }
                            key_history.push({c_id: id, c_type: 'count'});
                        }
                        /* No further need to iterate through list */
                        break;
                    }
                }
            }
            chart.render();
        }
    });

    jQuery(document).bind('keyup', function (e){
        var key, code;
        if (keyboard_active) {
            code = e.which;
            key = String.fromCharCode(code).toUpperCase();
            if (code === 173) {
                key = "-";// XXX: WTF
            }
            if (key === " ") {
                abnormal = false;
            }

            if (key === "1") {
                /* Exit view percentages mode */
                update_keyboard();
            }
        }
    });
});

function resize_keyboard(width) {
    /* Does nothing */
}

function register_reset_callbacks() {
    "use strict";

    // Initial reset button
    $('.reset_button').on('click', function() {
        $("#confirm-reset").modal("show");
    });

    $('#reset-count-confirm').on('click', function() {
        var total = 0;
        for (var i=0; i < count_data.length; i++) {
            total += count_data[i].count;
            total += count_data[i].abnormal;
        }
        log_stats(total);
        reset_counters();
        $("#confirm-reset").modal("hide");
    });

    $('#reset-count-cancel').on('click', function() {
        $("#confirm-reset").modal("hide");
    });
}

function reset_counters() {
    "use strict";
    for (var i = 0; i < count_data.length; i++) {
        count_data[i].count = 0;
        count_data[i].abnormal = 0;
    }
    key_history = [];
    update_keyboard();
    chart.render();
    open_keyboard();
}


function display_stats(count_total, format) {
    "use strict";
    var erythroid, i, j, cell_total, cell_percent, cell_percent_abnormal;
    var per="";
    var abnormal_total = 0;
    var stats_div = $('div#statistics');
    format = typeof format !== 'undefined' ? format: 'HTML';

    for (i=0; i < count_data.length; i++) {
        abnormal_total += count_data[i].abnormal;
    }

    for (i=0; i < count_data.length; i++) {
        cell_total = count_data[i].count + count_data[i].abnormal;
        cell_percent = Math.round(((cell_total / count_total) * 100));
        cell_percent_abnormal = 0;

        if (cell_total !== 0) {
            cell_percent_abnormal = Math.round(((count_data[i].abnormal / cell_total) * 100));
        }

        var cell_percent_string = '';
        var cell_percent_abnormal_string = '';

        if (count_data[i].abnormal === 0) {
            cell_percent_abnormal_string = 'N/A';
        } else if (cell_percent_abnormal === 0 && count_data[i].abnormal > 0) {
            cell_percent_abnormal_string = '<0.5%';
        } else {
            cell_percent_abnormal_string = cell_percent_abnormal.toString() + '%';
        }

        if (cell_percent === 0 && cell_total > 0) {
            cell_percent_string = '<0.5%';
        } else {
            cell_percent_string = cell_percent.toString() + '%';
        }

        if (format === 'HTML') {
            per += '<tr><td class="celltypes">' + count_data[i].readable_name + '</td><td class="ignore" style="background-color:' + count_data[i].visualisation_colour + '"></td><td>' + cell_percent_string + "</td><td class=\"abnormal_stats\">" + cell_percent_abnormal_string + '</td><td>' + count_data[i].count + '</td><td class="abnormal_count abnormal_stats">' + count_data[i].abnormal + '</td></tr>';
        } else {
            per += count_data[i].readable_name + ' ' + cell_percent_string;
            if (abnormal_total > 0) {
                per += ', abnormal ' + cell_percent_abnormal_string + '\n';
            } else {
                per += '\n';
            }
        }
    }

    /* N.B. Hacky erythroid/myeloid counting */
    for (i=0; i < count_data.length; i++) {
        if (count_data[i].machine_name === 'erythroid') {
            erythroid = count_data[i].count + count_data[i].abnormal;
        }
    }

    var myeloid = 0;
    var myeloid_cells = ['neutrophils', 'meta', 'myelocytes', 'promyelocytes',
        'basophils', 'eosinophils', 'monocytes'];

    for (i=0; i < myeloid_cells.length; i++) {
        for (j=0; j < count_data.length; j++) {
            if (count_data[j].machine_name === myeloid_cells[i]) {
                myeloid += (count_data[j].count + count_data[j].abnormal);
            }
        }
    }

    var me_ratio = parseFloat(myeloid / erythroid).toFixed(2);
    if (me_ratio === 'Infinity') {
        me_ratio = 'Incalculable';
    }
    stats_div.empty().append('<div id="output_style">Format output: <button id="htmlview" class="btn">HTML</button><button id="textview" class="btn">Text</button></div>');
    $('#htmlview').click(function() {
        display_stats(count_total, 'HTML');
    });
    $('#textview').click(function() {
        display_stats(count_total, 'TEXT');
    });

    var stats_text = '';

    if (format === 'HTML') {
        stats_text = '<h3>Count statistics</h3><table class="table table-bordered table-striped">';
        stats_text += '<tr><td colspan="2" class="celltypes">Cells Counted</td><td>' + count_total + '</td><td class="table_spacer" colspan="3"></td></tr>';
        stats_text += '<tr><td colspan="2" class="celltypes">ME ratio *</td><td>' + me_ratio + '</td><td class="table_spacer" colspan="3"></td></tr>';
        stats_text += '<tr><th colspan="2" style="width: 30%"></th><th>% Total</th><th class="abnormal_stats">% of CellType Abnormal</th><th>Normal</th><th class="abnormal_stats">Abnormal</th></tr>';
        stats_text += per;
        stats_text += '</table>';
        stats_text += '<p>* Note: Myeloid/erythroid ratio does not include blast count.</p>';
        stats_div.append(stats_text);
        $("#visualise2").css("display", "block");
    } else {
        stats_text = '<pre class="stats"><code>';
        stats_text += 'Cells Counted: ' + count_total + '\n';
        stats_text += 'M:E Ratio: ' + me_ratio + '\n';
        stats_text += per;
        stats_text += '</code></pre>';
        stats_div.append(stats_text);
    }

    if (abnormal_total === 0 && format === 'HTML') {
        /* If we don't have abnormal cells, don't show the columns */
        $('.abnormal_stats').hide();
        $('.table_spacer').attr('colspan', 1);
    }

    chart2.render();
}

function log_stats(total) {
    "use strict";
    if (total > 75) {
        $.ajax({
            url: '/api/stats/',
            type: 'POST',
            data: JSON.stringify({"count_total": total}),
            contentType: "application/json; charset=utf-8",
            async: true
        });
    }
}

function add_alert(alert_class, message) {
    "use strict";
    /* Adds alert messages in bootstrap style to page */
    var css_class = "";
    if (alert_class === 'ERROR') {
        css_class = 'alert-error';
    }
    var el = "<div class=\"alert " + css_class + "\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\">×</button><strong>" + alert_class + ":</strong> " + message + "</div>";
    $('#alerts').append(el);
}

function csrfSafeMethod(method) {
    "use strict";
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

function sameOrigin(url) {
    "use strict";
    // test that a given url is a same-origin URL
    // url could be relative or scheme relative or absolute
    var host = document.location.host; // host + port
    var protocol = document.location.protocol;
    var sr_origin = '//' + host;
    var origin = protocol + sr_origin;
    // Allow absolute or scheme relative URLs to same origin
    return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
        (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
        // or any other URL that isn't scheme relative or absolute i.e relative.
        !(/^(\/\/|http:|https:).*/.test(url));
}

$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        "use strict";
        var csrftoken = $.cookie('csrftoken');
        if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
            // Send the token to same-origin, relative URLs only.
            // Send the token only if the method warrants CSRF protection
            // Using the CSRFToken value acquired earlier
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});

