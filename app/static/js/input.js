Input = (function (element, view) {

    // Handle mouse rotate/pan events
    function setupMouseInteractions(element, panCallback, rotateCallback, zoomCallback,
                                    clickCallback, hoverCallback, leaveCallback) {

        function onMousedown(event) {

            var x=0, y=0, lastx, lasty, dx = 0, dy = 0;
            updateXY(event);
            var x0 = x, y0 = y;

            var w = element.offsetWidth, h = element.offsetHeight;

            window.addEventListener("resize", function(event) {
                w = element.offsetWidth, h = element.offsetHeight;
            });


            element.removeEventListener("mousemove", onMousemove);
            element.addEventListener("mousemove", _onMousemove);
            element.addEventListener("mouseup", onMouseup);
            element.addEventListener("mouseout", onMouseOut);
            var leftbutton = event.which == 1,
                middlebutton = event.which == 2,
                rightbutton = event.which == 3;

            function updateXY(event) {
                lasty = y;
                lastx = x;
                x = ((event.pageX - element.offsetLeft) / element.offsetWidth) * 2 - 1;
                y = -((event.pageY - element.offsetTop) / element.offsetHeight) * 2 + 1;
            }

            function _onMousemove(event) {
                updateXY(event);
                if (rightbutton) {
                    // TODO: do something more userfriendly here
                    dx = x - lastx;
                    rotateCallback(100*dx);
                } else if (middlebutton) {
                    panCallback(x-lastx, y-lasty);
                } else {
                    //hoverCallback(x, y);
                }
            }

            function onMouseup (event) {
                if (leftbutton) { // && x == x0 && y == y0) {
                    // condsidered a "click" if the mouse was not moved
                    clickCallback(x, y);
                }
                element.removeEventListener("mousemove", _onMousemove);
                element.removeEventListener("mouseup", onMouseup);
                element.removeEventListener("mouseout", onMouseup);
                element.addEventListener("mousemove", onMousemove);
            }

            function onMouseOut (event) {
                onMouseup(event);
                leaveCallback();
            }
        }



        // helper for mousewheel events
        var hookEvent = function (element, eventName, callback) {
            if(typeof(element) == "string")
                element = document.getElementById(element);
            if(element == null)
                return;
            if(element.addEventListener)
            {
                if(eventName == 'mousewheel')
                    element.addEventListener('DOMMouseScroll', callback, false);
                element.addEventListener(eventName, callback, false);
            }
            else if(element.attachEvent)
                element.attachEvent("on" + eventName, callback);
        };


        // attach callback for mousewheel zooming
        hookEvent(element, "mousewheel", function (event) {
            event = event ? event : window.event;
            var direction = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
            //var wheelData = event.detail ? event.detail : event.wheelDelta;
            var rect = element.getBoundingClientRect();
            if (direction < 0) {
                zoomCallback(0.9);
            } else {
                zoomCallback(1/0.9);
            }
        });


        function onMousemove(event) {
            var x = ((event.pageX - element.offsetLeft) / element.offsetWidth) * 2 - 1,
                y = -((event.pageY - element.offsetTop) / element.offsetHeight) * 2 + 1;
            hoverCallback(x, y);
        }

        element.addEventListener("contextmenu",
                                 function (e) {e.preventDefault(); return false;});
        element.addEventListener("mousedown", onMousedown);
        element.addEventListener("mousemove", onMousemove);

    }

    function setupTouchInteractions(element, rotateCallback, pinchCallback, panCallback) {
        var hammertime = new Hammer(element, myOptions);
        hammertime.get('pinch').set({ enable: true });
        hammertime.get('rotate').set({ enable: true });

        hammertime.on('pan', function(ev) {
            panCallback(ev);
        });

        hammertime.on('pinch', function(ev) {
            pinchCallback(ev);
        });

        hammertime.on('rotate', function (ev) {
            rotateCallback(ev);
        });


    }

    function setupKeyboardInteractions(turnCallback, rotateCallback, panCallback, levelCallback) {

        window.addEventListener("keydown", function (event) {
            console.log("Key pressed: " + event.keyCode);
            switch(event.keyCode) {
            case 68:
                panCallback(-0.1, 0);
                break;
            case 87:
                panCallback(0, -0.1);
                break;
            case 65:
                panCallback(0.1, 0);
                break;
            case 83:
                panCallback(0, 0.1);
                break;
            case 81:
                rotateCallback(15);
                break;
            case 69:
                rotateCallback(-15);
                break;
            case 49:  // 1
                turnCallback(-45);
                break;
            case 50:  // 2
                turnCallback(45);
                break;
            case 33:  // +
                levelCallback(1);
                break;
            case 34:  // -
                levelCallback(-1);
                break;
            }
        });
    }

    return {
        setupMouse: setupMouseInteractions,
        setupKeyboard: setupKeyboardInteractions
    };

})();
