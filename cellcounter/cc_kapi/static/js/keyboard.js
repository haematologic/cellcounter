/* Functions to handle keyboard functions */

function open_keyboard() {
    "use strict";
    $('#fuzz').fadeIn('slow', function () {
        resize_keyboard($("div#content").width());
        $('#counterbox').slideDown('slow', function () {
            $("#fuzz").css("height", $(document).height());
            keyboard_active = true;
        });
    });
    $('div#statistics').empty();
    $("#visualise2").css("display", "none");
    $("#savefilebutton").css("display", "none");
    chart.render();
}

function close_keyboard() {
    var total;

    if (editing_keyboard) {
        return;
    }

    if (keyboard_active) {
        keyboard_active = false;
        total = 0;

        for (i=0; i < count_data.length; i++) {
            $("#id_"+i+"-normal_count").prop("value", count_data[i].count);
            $("#id_"+i+"-abnormal_count").prop("value", count_data[i].abnormal);
            total += count_data[i].count;
            total += count_data[i].abnormal;
        }

        if (total > 0) {
            log_stats(total);
            display_stats(total);
        }

        $('#counterbox').slideUp('slow', function () {
            $('#fuzz').fadeOut('slow', function () {
            });
        });

        show_keyboard_buttons();
    }
}

function show_keyboard_buttons() {
    $("#openkeyboard").show();
    $("#resetkeyboard").show();
}

function set_keyboard(mapping) {
    "use strict";
    keyboard_map = mapping;
    update_keyboard();
    chart.render();
}

function load_keyboard(keyboard_id) {
    "use strict";
    if (keyboard_id === undefined) {
        $.getJSON("/api/keyboards/default/", function(data) {
            keyboard_map = data;
            update_keyboard();
            chart.render();
        });
    } else {
        var keyboard = {};
        $.ajax({
            url: '/api/keyboards/' + keyboard_id + '/',
            type: 'GET',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            async: false,
            success: function(data) {
                keyboard = data;
            }
        });
        return keyboard;
    }
}

function set_keyboard_primary(keyboard_id) {
    "use strict";
    var keyboard = load_keyboard(keyboard_id);
    keyboard.is_primary = true;
    save_keyboard(keyboard);
    return false;
}

function delete_specific_keyboard(keyboard_id) {
    "use strict";
    var keyboard = load_keyboard(keyboard_id);
    $.ajax({
        url: '/api/keyboards/' + keyboard.id + '/',
        type: 'DELETE',
        data: JSON.stringify(keyboard),
        contentType: "application/json; charset=utf-8",
        async: false
    });
}

function update_keyboard() {
    "use strict";
    var i, j, k;
    var keyboard_keys = $("#keysbox").find("div.box1");

    for (var cell in cell_types) {
        if (cell_types.hasOwnProperty(cell)) {
            cell_types[cell].box = [];
        }
    }

    for (i = 0; i < keyboard_keys.length; i++) {
        var item = $(keyboard_keys[i]);
        var key = item.attr("id");

        item.empty();
        item.append("<p>"+key+"</p>");

        for (j = 0; j < keyboard_map.mappings.length; j++) {

            if (keyboard_map.mappings[j].key === key) {
                var cell_id = keyboard_map.mappings[j].cellid;
                var cell_data = cell_types[cell_id];
                /* Adds keyboard key div to list of attached keys */
                cell_data.box.push(item);
                var name = cell_data.abbr_name;

                var cell_count, cell_abnormal;
                for (k=0; k < count_data.length; k++) {
                    if (count_data[k].id === cell_id) {
                        cell_count = count_data[k].count;
                        cell_abnormal = count_data[k].abnormal;
                    }
                }
                item.append("<div class=\"name\">"+name+"</div>");
                item.append("<div class=\"count\"><span class=\"countval\">"+cell_count+"</span> <span class=\"abnormal abnormal_count\">("+cell_abnormal+")</span></div>");

                // Attach cell visualisation_colour to key
                item.find("p").css("background-color", cell_data.visualisation_colour);
            }
        }
    }
}

function register_keyboard_callbacks() {
    $('#edit_button').on('click', edit_keyboard);
}


function edit_keyboard() {
    "use strict";

    if (editing_keyboard) {
        return;
    }
    var cell;
    var list = "<ul>";

    for (cell in cell_types) {
        if (cell_types.hasOwnProperty(cell)) {
            list += "<li><div class=\"element\"><div class=\"edit_colour_swatch\" id=\"swatch_"+cell+"\"></div>"+cell_types[cell].readable_name+"</div><div class=\"cellid\" style=\"display: none;\">"+cell+"</div></li>";
        }
    }
    list += "</ul>";
    
    var cell_list_div = $("div#celllist");

    cell_list_div.empty();
    cell_list_div.append(list);

    for (cell in cell_types) {
        if (cell_types.hasOwnProperty(cell)) {
            $("div#swatch_"+cell).css("background-color", cell_types[cell].visualisation_colour);
        }
    }

    cell_list_div.find("div.element").click(function() {
        edit_cell_id = $(this).find("div.cellid").text();
        $("div#celllist").find("li").css("background", "");
        deselect_element(selected_element);
        selected_element = $(this).parent();
        select_element($(this).parent());
    });

    var el = cell_list_div.find("li").first();
    select_element(el);

    $("#clearkeyboard").click(function() {
        clear_keyboard();
    });

    editing_keyboard = true;

    var save_text = "Save";
    var save_keys = true;
    if(typeof notloggedin !== 'undefined') {
        save_text = "Close";
        save_keys = false;
    }

    var d = $("div#editkeymapbox").dialog({
        close: function() {
            end_keyboard_edit();
        },
        open: function() {
            //remove focus from the default button
            $('.ui-dialog :button').blur();
        },
        resizable: false,
        buttons: [ {text: save_text,
                    click: function() {
                        if (save_keys) {
                            save_keyboard();
                        } else {
                            end_keyboard_edit();
                        }
                    }
                    },
                    {text: 'Save as New',
                     click: function() {
                         if (save_keys) {
                             keyboard_name_input();
                         } else {
                             end_keyboard_edit();
                         }
                     }
                    },
                    {text: "Revert",
                     click: function() {
                         load_keyboard();
                         $("div#editkeymapbox").dialog("close");
                     }
                    }
                ],
        width: "368px"
    });

    $(d).dialog('widget')
        .position({ my: 'right top', at: 'right top', of: $("div#counterbox") });

    if (!save_keys) {
        $(":button:contains('Save as New')").remove();
    }
}

function select_element(el) {
    "use strict";

    selected_element = $(el);

    if(!selected_element.html()) {
        selected_element = $("div#celllist").find("li").first();
        el = selected_element;
        selected_element = $(selected_element);
    }

    if(selected_element.html()) {
        edit_cell_id = $(el).find("div.cellid").text();
        $(el).addClass("selected");
    }
    else {
        edit_cell_id = -1;
    }
}

function deselect_element(el) {
    "use strict";

    $(el).removeClass("selected");
}

function keyboard_name_input() {
    "use strict";
    // Disable keyboard capture for edit/input
    editing_keyboard = false;
    keyboard_active = false;
    // Show us the keyboard modal
    $("#keyboard_name").modal("show");
}

function save_new_keyboard(keyboard_name) {
    "use strict";
    // Takes keyboard_name from dialog and creates keyboard
    // Scraps any pre-existing keyboard_id
    delete(keyboard_map.id);
    keyboard_name = keyboard_name || 'NewKeyboard';
    keyboard_map.label = keyboard_name;
    save_keyboard();

    $("#keyboard_name").modal("hide");
    // This is required to override default modal hide behaviour (above)
    // as when a keyboard is successfully saved, user should return to
    // count.
    editing_keyboard = false;
}

function save_keyboard(keyboard) {
    "use strict";

    if (typeof keyboard === 'undefined') {
        keyboard = keyboard_map;
    }

    if ("id" in keyboard) {
        $.ajax({
            url: '/api/keyboards/' + keyboard.id + '/',
            type: 'PUT',
            data: JSON.stringify(keyboard),
            contentType: "application/json; charset=utf-8",
            async: false,
            success: function() {
                add_alert('INFO', 'Keyboard saved');
                end_keyboard_edit();
            }
        });
    } else {
        $.ajax({
            url: '/api/keyboards/',
            type: 'POST',
            data: JSON.stringify(keyboard),
            contentType: "application/json; charset=utf-8",
            async: false,
            success: function() {
                add_alert('INFO', 'Keyboard saved');
                end_keyboard_edit();
            }
        });
    }
}

function end_keyboard_edit() {
    "use strict";

    $("div#celllist").empty();

    editing_keyboard = false;
    edit_cell_id = -1;
    $("#edit_button").show();
    $("div#editkeymapbox").dialog("close");
}

function clear_keyboard() {
    "use strict";
    /* Clear keyboard needs to provide the correct keyboard_map structure
     * otherwise modification of a blank keyboard fails. Also maintain
     * object ID when clearing keyboards so we save to the right place.
      * N.B. .toISOString() requires a shim for IE<= 8 */
    if ('id' in keyboard_map) {
        var id = keyboard_map.id;
    }
    var date = new Date(Date.now()).toISOString();
    keyboard_map = {"label": "Default", "is_primary": true, "created": date,
                    "last_modified": date, "mappings": []};
    if (typeof id !== 'undefined') {
        keyboard_map.id = id;
    }
    update_keyboard();
}

