/*jslint browser: true*/
/*jslint plusplus: true */
/*global $, jQuery, console, Firebase*/

(function () {
    "use strict";

    // jQuery hacks (missing some standard properties to event object)
    $.event.props.push('dataTransfer');
    $.event.props.push('clientX');
    $.event.props.push('clientY');

    // offset_data: Global variable as Chrome doesn't allow access to event.dataTransfer in dragover
    var count = 0, offset_data, countPerson, alreadyExists, //currentTable
        currentConfiguration = [], currentTitle = "(Unset title)", people = [], initialPeople = [], configurations = [], targetTableDrop,
        FB = "https://flickering-fire-NNN.firebaseio.com/wedding-tables/"; // YOUR FIREBASE BACKEND URL

    window.checkPeople = function () {
        var i, name, gender;
        
        $(".seatContainer .label").removeClass("error-double error-missing female male");
        $("#managePeople tbody tr").removeClass("seated");
        
        // check from table
        for (i in people) {
            countPerson = 0;
            name = people[i].name;
            gender = people[i].gender;
            $(".seatContainer .label").each(function () {
                if ($(this).text().toLowerCase() === name.toLowerCase()) {
                    countPerson++;
                    if (gender === "Male") {
                        $(this).addClass("male");
                    } else if (gender === "Female") {
                        $(this).addClass("female");
                    }
                }
            });
            if (countPerson >= 1) {
                // seated
                $("#managePeople tbody tr").each(function () {
                    if ($(this).find("td:nth-child(2)").text().toLowerCase() === name.toLowerCase()) {
                        $(this).addClass("seated");
                    }
                });
            } 
            if(countPerson > 1) {
                $(".seatContainer .label").each(function () {
                    if ($(this).text().toLowerCase() === name.toLowerCase()) {
                        $(this).addClass("error-double");
                    }
                });
            }
        }
        
        // check from seats
        $(".seatContainer .label").each(function () {
            name = $(this).text();
            countPerson = 0;
            $("#managePeople tbody tr").each(function () {
                if ($(this).find("td:nth-child(2)").text().toLowerCase() === name.toLowerCase()) {
                    countPerson++;
                }
            });
            if (countPerson === 0) {
                $(this).addClass("error-missing");
            }
            //if(name.indexOf("New (") === 0) {
            //    $(this).removeClass("error-missing");
            //}
        });
    };
    
    window.removeSeat = function (seatElt) {
        var tableContainerElt = $(seatElt).parent().parent(), seats, nbrSeats;
        $(seatElt).parent().remove();

        // Nbr of seats
        seats = tableContainerElt.find(".seatContainer");
        nbrSeats = seats.length;

        // Reposition the seats around the table
        seats.each(function (i) {
            var seat = $(this);
            seat.css("left", 75 + 50 - 3 + Math.cos(Math.PI / 2 - 2 * Math.PI * i / nbrSeats) * (75 + 50 / 2));
            seat.css("top", 75 + 50 - 3 - Math.sin(Math.PI / 2 - 2 * Math.PI * i / nbrSeats) * (75 + 50 / 2));
            if (i / nbrSeats > 0.5) {
                seat.find(".label").attr("class", "label left");
            } else {
                seat.find(".label").attr("class", "label right");
            }
        });
        
        window.checkPeople();
    };

    window.newSeat = function (tableContainerElt, title, focus) {
        var seats = $(tableContainerElt).find(".seatContainer"), nbrSeats = seats.length + 1, seatContainer = $("<div></div>").addClass("seatContainer"),
            seat, label;
        seat = $("<div></div>").addClass("seat").attr("draggable", true).attr("id", "tableSeat" + count++)
            .on({
                dragstart: function (event) {
                    event.dataTransfer.setData("type", "seat");
                    event.dataTransfer.setData("id", event.target.id);
                    event.dataTransfer.setData("label", $(event.target).parent().find(".label").text());
                    //currentTable = $(event.target).parent().parent();
                    $(this).parent().parent().find(".table .newSeat").hide();
                    $(this).parent().parent().find(".table .deleteSeat").show();
                    $(this).parent().parent().find(".table").addClass("deleteDrop");
                    event.stopPropagation();
                },
                /*dragend: function(event) { ---> deplace dans deleteSeatDrop()
                    currentTable.find(".newSeat").show();
                    currentTable.find(".deleteSeat").hide();
                    currentTable.find(".table").removeClass("deleteDrop"); 
                },*/
                drop: function (event) {
                    var destinationLabel = $(event.target).parent().find(".label").text(), sourceLabel = event.dataTransfer.getData("label");
                    console.log(sourceLabel + " -> " + destinationLabel);
                    $(event.target).parent().find(".label").html(sourceLabel);
                    $("#" + event.dataTransfer.getData("id")).parent().find(".label").html(destinationLabel);
                    event.stopPropagation();
                    
                    window.checkPeople();

                    $("#container").find(".newSeat").show();
                    $("#container").find(".deleteSeat").hide();
                    $("#container").find(".table").removeClass("deleteDrop");
                }
            });

        seatContainer.append(seat);
        label = $("<div></div>").addClass("label").html(title || ("New (" + nbrSeats + ")")).attr("contentEditable", true)
            .on({
                keydown: function (event) {
                    if (event.keyCode === 13) {
                        event.preventDefault();
                        event.target.blur();
                    }
                },
                focus: function (event) {
                    label.focusValue = $(event.target).text();
                },
                click: function () {
                    document.execCommand('selectAll', false, null);
                    $(this).removeClass("error-missing error-double male female");// @@@@
                },
                blur: function (event) {
                    // Equivalent to change event of a classical form element
                    if ($(event.target).text() !== event.target.focusValue) {
                        window.checkPeople();
                    }
                }
            });
        seatContainer.append(label);
        $(tableContainerElt).append(seatContainer);

        // Reposition the seats around the table
        seats = $(tableContainerElt).find(".seatContainer").each(function (i) {
            var seat = $(this);
            // TODO plus simple de faire par rapport au table plutôt que le table container
            seat.css("left", 75 + 45 - 3 + Math.cos(Math.PI / 2 - 2 * Math.PI * i / nbrSeats) * (75 + 45 / 2));
            seat.css("top", 75 + 45 - 3 - Math.sin(Math.PI / 2 - 2 * Math.PI * i / nbrSeats) * (75 + 45 / 2));
            if (i / nbrSeats > 0.5) {
                seat.find(".label").attr("class", "label left");
            } else {
                seat.find(".label").attr("class", "label right");
            }
        });
        
        window.checkPeople();

        // Set focus & select all the text
        if (focus === undefined || focus === true) {
            label.focus();
            document.execCommand('selectAll', false, null);
            label.removeClass("error-missing error-double male female");
        }
    };

    window.deleteSeatDrop = function (event) {
        var type = event.dataTransfer.getData("type"), seat, tableContainer, label;
        if (type === "seat") {


            seat = $("#" + event.dataTransfer.getData("id"));
            if(seat.parents(".tableContainer").find(".table")[0] == targetTableDrop[0]) {
                // if seat is droped from on the same table
                console.log("deleteSeatDrop: remove seat");
                window.removeSeat(seat);
            } else {
                console.log("deleteSeatDrop: deplace");
                label = seat.parent().find(".label").text();
                console.log("label="+label);
                window.newSeat(targetTableDrop.parent(), label, false);
                window.removeSeat(seat);
            }
            $("#container").find(".newSeat").show();
            $("#container").find(".deleteSeat").hide();
            $("#container").find(".table").removeClass("deleteDrop");
            event.stopPropagation();
        }
        window.checkPeople();
    };

    window.newTable = function (offsetLeft, offsetTop, backgroundColor) {
        var tableContainer = $("<div></div>").addClass("tableContainer circle"), table;
        tableContainer.css("top", offsetTop || 20); // ($("#container").height() - 400)
        tableContainer.css("left", offsetLeft || 20); // ($("#container").width() - 400)
        tableContainer.attr("id", "tableCircle" + count++).attr("draggable", true)
            .on({
                dragstart: function (event) {
                    event.dataTransfer.setData("type", "table");
                    event.dataTransfer.setData("id", event.target.id);
                    var style = window.getComputedStyle(event.target, null);
                    offset_data = (parseInt(style.getPropertyValue("left"), 10) - event.clientX) + ',' + (parseInt(style.getPropertyValue("top"), 10) - event.clientY);
                    event.dataTransfer.setData("offset_data", offset_data);
                    $("#newTable").hide();
                    $("#deleteTable").show();
                    $("#save").hide();
                    $(event.target).css("opacity", 0.5);
                },
                dragend: function (event) {
                    $("#newTable").show();
                    $("#deleteTable").hide();
                    $("#save").show();
                    $(event.target).css("opacity", 1);
                }
            });
        table = $("<div></div>").addClass("table circle").on("drop", function (event) {
            targetTableDrop = $(this);
            window.deleteSeatDrop(event);
        })
            .html('<div class="newSeat"><b>+</b> New seat</div><div class="deleteSeat">Delete seat</div>')
            .css("backgroundColor", backgroundColor || "rgb(222, 234, 250)");
        tableContainer.append(table);
        table.find(".newSeat").click(function () {
            window.newSeat($(this).parent().parent());
        });

        $("#container").append(tableContainer);
        return tableContainer;
    };

    window.containerDragOver = function (event) {
        var type = event.dataTransfer.getData("type"), offset, dm = $("#" + event.dataTransfer.getData('id'));
        if (type === "table") {
            try {
                offset = event.dataTransfer.getData("offset_data").split(',');
            } catch (e) {
                offset = offset_data.split(',');
            }
            dm.css("left", (event.clientX + parseInt(offset[0], 10)) + 'px');
            dm.css("top", (event.clientY + parseInt(offset[1], 10)) + 'px');
            event.preventDefault();
            return false;
        }
        event.preventDefault();
    };

    window.containerDrop = function (event) {
        var type = event.dataTransfer.getData("type"), id = event.dataTransfer.getData("id"), offset, seat,
            circleContainer, circle, seats, nbrSeats, centerX, centerY, atan, angle, slice, ratio, int_ratio,
            objLabels, iReference, label, iMove, i;
        if (type === "table") {
            //event.preventDefault();
            circle = $("#" + id);
            try {
                offset = event.dataTransfer.getData("offset_data").split(',');
            } catch (e) {
                offset = offset_data.split(',');
            }
            circle.css("left", (event.clientX + parseInt(offset[0], 10)) + 'px');
            circle.css("top", (event.clientY + parseInt(offset[1], 10)) + 'px');
            event.preventDefault();

            // if droped on "delete table" area :
            if (event.clientX > window.innerWidth - (250 * 2 / 3 + 20)
                    && event.clientY > window.innerHeight - (250 * 2 / 3 + 20)) {
                $("#" + event.dataTransfer.getData("id")).remove();
				window.checkPeople();
            }

            $("#newTable").show();
            $("#deleteTable").hide();
            $("#save").show();
            $(event.target).css("opacity", 1);

            return false;
        } else if (type === "seat") {
            seat = $("#" + id);
            circleContainer = seat.parent().parent();
            circle = $("#" + id).parent().parent().find(".table:first");
            seats = circleContainer.find(".seatContainer");
            nbrSeats = seats.length;
            centerX = circle.offset().left + 75 + 3;
            centerY = circle.offset().top + 75 + 3;
            atan = Math.atan((event.clientY - centerY) / (event.clientX - centerX));
            slice = 2 * Math.PI / nbrSeats;
            if (event.clientX - centerX >= 0) {
                // at the right of the disk
                // top : -PI/2, right: 0, bottom: PI/2
                // angle from the top of the circle
                angle = atan + Math.PI / 2;
            } else {
                // at the left of the disk
                // top : -PI/2, right: 0, bottom: PI/2
                // angle from the top of the circle
                angle = atan + 3 * Math.PI / 2;
            }
            ratio = angle / slice;
            int_ratio = parseInt(ratio, 10);
            objLabels = [];
            circleContainer.find(".label").each(function () {
                objLabels.push($(this).text());
            });
            //console.log(JSON.stringify(objLabels));
            iReference = int_ratio;
            seats.each(function (i) {
                if (seat.parent().is($(this))) {
                    iMove = i;
                }
            });
            label = objLabels[iMove];
            objLabels.splice(iMove, 1);
            objLabels.splice(iReference === nbrSeats - 1 ? 0 : iReference, 0, label);
            //console.log(objLabels);
            seats.each(function () {
                window.removeSeat($(this).find(".seat"));
            });
            for (i = 0; i < objLabels.length; ++i) {
                window.newSeat(circleContainer, objLabels[i], false);
            }
            // Reposition the seats around the table
            seats.each(function (i) {
                var seat = $(this);
                seat.css("left", 75 + 50 - 3 + Math.cos(Math.PI / 2 - 2 * Math.PI * i / nbrSeats) * (75 + 50 / 2));
                seat.css("top", 75 + 50 - 3 - Math.sin(Math.PI / 2 - 2 * Math.PI * i / nbrSeats) * (75 + 50 / 2));
                if (i / nbrSeats > 0.5) {
                    seat.find(".label").attr('class', "label left");
                } else {
                    seat.find(".label").attr('class', "label right");
                }
            });

            $("#container").find(".newSeat").show();
            $("#container").find(".deleteSeat").hide();
            $("#container").find(".table").removeClass("deleteDrop");
        }
    };

    window.save = function () {
        var objJson, fb, obj;
        // title = encodeURIComponent(currentTitle).replace(".", "2E")
        currentConfiguration = [];
        $("#container .tableContainer").each(function () {
            var objLabels = [];
            $(this).find(".label").each(function () {
                objLabels.push($(this).text());
            });
            currentConfiguration.push({
                offsetLeft: $(this).css("left"),
                offsetTop: $(this).css("top"),
                backgroundColor: $(this).find(".table").css("backgroundColor"),
                seats: objLabels
            });
        });
        obj = {
            current: currentTitle,
            configurations: configurations,
            people: people
        };
        obj.configurations[currentTitle] = currentConfiguration;
        //console.log(JSON.stringify(obj));
        fb = new Firebase(FB);
        fb.set(obj, function (error) {
            if (error) {
                console.log('Synchronization failed');
                $("#error").show();
                setTimeout(function () {$("#error").hide(); }, 5000);
            } else {
                console.log('Synchronization succeeded');
                $("#saved").show();
                setTimeout(function () {$("#saved").hide(); }, 5000);
            }
        });
    };
    
    window.savePeople = function () {
        var objJson, fb, obj;
        // title = encodeURIComponent(currentTitle).replace(".", "2E")
        fb = new Firebase(FB);
        fb.set(people, function (error) {
            if (error) {
                console.log('Synchronization failed');
                $("#error").show();
                setTimeout(function () {$("#error").hide(); }, 5000);
            } else {
                console.log('Synchronization succeeded');
                $("#saved").show();
                setTimeout(function () {$("#saved").hide(); }, 5000);
            }
        });
    };
    
    window.removeConfiguration = function (title) {
        var obj = {
            current: currentTitle,
            configurations: configurations,
            people: people
        }, fb;
        delete obj.configurations[title];
        if(currentTitle === title) {
            if(configurations == undefined || configurations.length === 0) {
                currentTitle = "Enter title here";
                $("#configurationTitle").text(currentTitle);
                obj.current = "Enter title here";
            } else {
                currentTitle = Object.keys(configurations).pop();
                $("#configurationTitle").text(currentTitle);
                obj.current = currentTitle;
            }
        }
        //console.log(JSON.stringify(obj));
        fb = new Firebase(FB);
        fb.set(obj, function (error) {
            if (error) {
                console.log('Synchronization failed');
                $("#error").show();
                setTimeout(function () {$("#error").hide(); }, 5000);
            } else {
                console.log('Synchronization succeeded');
                $("#saved").show();
                setTimeout(function () {$("#saved").hide(); }, 5000);
            }
        });
    };
    
    window.newConfiguration = function () {
        $("#container .tableContainer").remove();
        currentTitle = "Enter title here";
        $("#menuSaveCurrent").hide();
        $("#configurationTitle").text(currentTitle);
        $("#changeTitle input").val(currentTitle);
    }
    
    window.rename = function (oldTitle, newTitle) {
        var currentConfiguration = configurations[oldTitle];
        delete configurations[oldTitle];
        configurations[newTitle] = currentConfiguration;
        currentTitle = newTitle;
        $("#configurationTitle").text(currentTitle);
        $("#changeTitle input").val(currentTitle);
        console.log("rename: " + oldTitle + " -> " + newTitle);
        window.save();
    };

    window.load = function (title) {
        $("#loading").show();
        var fb = new Firebase(FB), obj, objJson, i, j, tableContainer;
        fb.on("value", function (data) {
            $("#loading").hide();
            var tables = $("#container .tableContainer").remove(), obj;
            obj = data.val();
            if (!obj) {
                return;
            }
            console.log('Synchronization succeeded');
            $("#saved").show();
            setTimeout(function () {$("#saved").hide(); }, 5000);
            //obj = JSON.parse(objJson);
            //console.log(JSON.stringify(obj));
            currentTitle = title || obj.current || currentTitle;
            configurations = obj.configurations || {};
            currentConfiguration = configurations[currentTitle] || [];
            people = obj.people || [];
            initialPeople = people.slice();
            console.log("load: " + currentTitle);
            console.log(title + " " + obj.current + " " + currentTitle);
            console.log(currentConfiguration);
            for (i = 0; i < currentConfiguration.length; ++i) {
                tableContainer = window.newTable(currentConfiguration[i].offsetLeft, currentConfiguration[i].offsetTop, currentConfiguration[i].backgroundColor);
                if (currentConfiguration[i].seats) {
                    for (j = 0; j < currentConfiguration[i].seats.length; ++j) {
                        window.newSeat(tableContainer, currentConfiguration[i].seats[j], false);
                    }
                }
            }
            $("#menuLoad").empty();
            if (configurations && configurations.length !== 0) {
                for (i in configurations) {
                    if (typeof i === "string") {
                        $("#menuLoad").append($('<li><a href="#" onclick="load(\'' + i.replace(/\'/g, "\\'") + '\');">Load "' + i + '"</a></li>'));
                    }
                }
            }
            $("#menuRemove").empty();
            if (configurations && configurations.length !== 0) {
                for (i in configurations) {
                    if (typeof i === "string") {
                        $("#menuRemove").append($('<li><a href="#" onclick="removeConfiguration(\'' + i.replace(/\'/g, "\\'") + '\');">Remove permanently "' + i + '"</a></li>'));
                    }
                }
            }
            $("#configurationTitle").text(currentTitle);
            if (currentTitle !== "Enter title here") {
                $("#menuSaveCurrent").show().text("Save \"" + currentTitle + "\"");
            }
            $("#changeTitle input").val(currentTitle);
            window.writePersons();
            title = null;
        });
    };
    
    window.createPerson = function () {
        var name = $("#managePeople input").val(), isMale = $("#managePeople input").parents("tr").find("span").hasClass("alert-info"), i, n;
        if (people === undefined) {
            people = [];
        }
        
        if(name.trim() === "") {
            alert("Name cannot be empty !");
            return;
        }
        
        alreadyExists = false;
        $("#managePeople tbody tr").each(function () {
            if ($(this).find("td:nth-child(2)").text().toLowerCase() === name.toLowerCase()) {
                alreadyExists = true;
            }
        });
        if(alreadyExists) {
            alert("'" + name + "' Already exists !"); // TODO not clean
            return;
        }
        
        people.push({
            gender: isMale ? "Male" : "Female",
            name: name
        });
        var newLine = $('<tr><td><span class="badge gender-toggle alert-' + (isMale ? "info" : "danger") + '">' + (isMale ? "Male" : "Female") + '</span></td><td>' + name + '</td>'
            + '<td><button type="button" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-remove" aria-hidden="true" onclick="removePerson(this)"></span></button></td></tr>');
        $("#managePeople input").parents("tr").before(newLine).find("input").val("");
        $(".gender-toggle").unbind("click").click(function () {
            $(this).toggleClass("alert-danger alert-info");
            if($(this).hasClass("alert-info")) {
                $(this).text("Male");
                for(i = 0; i<people.length; ++i) {
                    n = $(this).parents("tr").find("td:nth-child(2)").text();
                    if(people[i].name === n) {
                        people[i].gender = "Male";
                        break;
                    }
                }
            } else {
                $(this).text("Female");
                for(i = 0; i<people.length; ++i) {
                    n = $(this).parents("tr").find("td:nth-child(2)").text();
                    if(people[i].name === n) {
                        people[i].gender = "Female";
                        break;
                    }
                }
            }
            window.checkPeople();
        });
        window.checkPeople();
    }
    
    window.removePerson = function (deleteButton) {
        var tr = $(deleteButton).parents("tr"), name = tr.find("td:nth-child(2)").text(), i;
        tr.remove();
        for(i = 0; i<people.length; ++i) {
            if(people[i].name === name) {
                people.splice(i, 1);
                break;
            }
        }
        window.checkPeople();
    }
    
    window.writePersons = function () {
        var newLine, i, set = $("#managePeople tbody tr"), setLength = set.length, n;
        if(people == undefined) {
            people = [];
        }
        set.each(function (index) {
            if(index != setLength - 1) {
                $(this).remove();
            }
        });
        for(i = 0; i<people.length; ++i) {
            newLine = $('<tr><td><span class="badge gender-toggle alert-' + (people[i].gender === "Male" ? "info" : "danger") + '">' + (people[i].gender === "Male" ? "Male" : "Female") 
                + '</span></td><td>' + people[i].name
                + '</td><td><button type="button" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-remove" aria-hidden="true" onclick="removePerson(this)"></span> </button></td></tr>');
            $("#managePeople input").parents("tr").before(newLine).find("input").val("");
        }
        $(".gender-toggle").unbind("click").click(function () {
            $(this).toggleClass("alert-danger alert-info");
            if($(this).hasClass("alert-info")) {
                $(this).text("Male");
                for(i = 0; i<people.length; ++i) {
                    n = $(this).parents("tr").find("td:nth-child(2)").text();
                    if(people[i].name === n) {
                        people[i].gender = "Male";
                        break;
                    }
                }
            } else {
                $(this).text("Female");
                for(i = 0; i<people.length; ++i) {
                    n = $(this).parents("tr").find("td:nth-child(2)").text();
                    if(people[i].name === n) {
                        people[i].gender = "Female";
                        break;
                    }
                }
            }
            window.checkPeople();
        });
        window.checkPeople();
    }
    
    window.cancelPeople = function () {
        console.log(initialPeople);
        people = initialPeople.slice();
        window.writePersons();
    }
    
    // on page load
    $(function () {
        currentTitle = "Enter title here";
        $("#configurationTitle").text(currentTitle);
        $("#menuSaveCurrent").hide();
        $("#changeTitle input").val(currentTitle).click(function () {
            document.execCommand('selectAll', false, null);
        });
        $('#changeTitle').on('shown.bs.modal', function () {
            $(this).find("input").val(currentTitle).focus();
            document.execCommand('selectAll', false, null);
        });
        $('#saveAsModal').on('shown.bs.modal', function () {
            $(this).find("input").val("").focus();
        });
        $("#changeTitle .btn-primary").click(function () {
            var newTitle = $(this).parent().parent().find("input").val(), oldTitle = currentTitle;
            currentTitle = newTitle;
            $("#configurationTitle").text(currentTitle);
            $("#menuSaveCurrent").text("Save \"" + currentTitle + "\"");
            rename(oldTitle, currentTitle);
        });
        $("#saveAsModal .btn-primary").click(function () {
            var newTitle = $(this).parent().parent().find("input").val();
            currentTitle = newTitle;
            currentConfiguration = configurations[currentTitle];
            $("#configurationTitle").text(currentTitle);
            $("#menuSaveCurrent").text("Save \"" + currentTitle + "\"");
            save();
        });
        $(".gender-toggle").unbind("click").click(function () {
            $(this).toggleClass("alert-danger alert-info");
            if($(this).hasClass("alert-info")) {
                $(this).text("Male");
            } else {
                $(this).text("Female");
            }
            window.checkPeople();
        });
        $(".modal-body").css("maxHeight", $( window ).height() - 200);
    });
}());
