// ==UserScript==
// @name         HunttingTeacher
// @version      0.1.4
// @namespace    https://github.com/niubilityfrontend
// @description  51Talk.辅助选老师-有效经验值|好评率|年龄|Top 5；有效经验值=所有标签数量相加后除以5；好评率=好评数/总评论数；年龄根据你的喜好选择。
// @author       jimbo
// @license      GPLv3
// @supportURL   https://github.com/niubilityfrontend/huttingtecaheron51talk
// @match        https://www.51talk.com/ReserveNew/index*
// @match        http://www.51talk.com/ReserveNew/index*
// @icon         https://avatars3.githubusercontent.com/u/25388328
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// ==/UserScript==
(function () {
    'use strict';
    ; (function ($) {
        jQuery.fn.scrollFix = function (height, dir) {
            height = height || 0;
            height = height == "top" ? 0 : height;
            return this.each(function () {
                if (height == "bottom") {
                    height = document.documentElement.clientHeight - this.scrollHeight;
                } else if (height < 0) {
                    height = document.documentElement.clientHeight - this.scrollHeight + height;
                }
                var that = $(this),
                    oldHeight = false,
                    p, r, l = that.offset().left;
                dir = dir == "bottom" ? dir : "top"; //默认滚动方向向下
                if (window.XMLHttpRequest) { //非ie6用fixed


                    function getHeight() { //>=0表示上面的滚动高度大于等于目标高度
                        return (document.documentElement.scrollTop || document.body.scrollTop) + height - that.offset().top;
                    }
                    $(window).scroll(function () {
                        $('#filterdialog').dialog("open");
                        if (oldHeight === false) {
                            if ((getHeight() >= 0 && dir == "top") || (getHeight() <= 0 && dir == "bottom")) {
                                oldHeight = that.offset().top - height;
                                that.css({
                                    position: "fixed",
                                    top: height,
                                    left: l
                                });
                            }
                        } else {
                            if (dir == "top" && (document.documentElement.scrollTop || document.body.scrollTop) < oldHeight) {
                                that.css({
                                    position: "fixed"
                                });
                                oldHeight = false;
                            } else if (dir == "bottom" && (document.documentElement.scrollTop || document.body.scrollTop) > oldHeight) {
                                that.css({
                                    position: "fixed"
                                });
                                oldHeight = false;
                            }
                        }
                    });
                } else { //for ie6
                    $(window).scroll(function () {
                        if (oldHeight === false) { //恢复前只执行一次，减少reflow
                            if ((getHeight() >= 0 && dir == "top") || (getHeight() <= 0 && dir == "bottom")) {
                                oldHeight = that.offset().top - height;
                                r = document.createElement("span");
                                p = that[0].parentNode;
                                p.replaceChild(r, that[0]);
                                document.body.appendChild(that[0]);
                                that[0].style.position = "absolute";
                            }
                        } else if ((dir == "top" && (document.documentElement.scrollTop || document.body.scrollTop) < oldHeight) || (dir == "bottom" && (document.documentElement.scrollTop || document.body.scrollTop) > oldHeight)) { //结束
                            that[0].style.position = "absolute";
                            p.replaceChild(that[0], r);
                            r = null;
                            oldHeight = false;
                        } else { //滚动
                            that.css({
                                left: l,
                                top: height + document.documentElement.scrollTop
                            })
                        }
                    });
                }
            });
        };
    })(jQuery);

    $("head").append(
        '<link '
        + 'href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" '
        + 'rel="stylesheet" type="text/css">'
    );
    function sleep(delay) {
        var start = (new Date()).getTime();
        while ((new Date()).getTime() - start < delay) {
            continue;
        }
    }
    //删除数组中的空元素
    Array.prototype.clean = function (deleteValue = "") {
        for (var i = 0; i < this.length; i++) {
            if (this[i] == deleteValue) {
                this.splice(i, 1);
                i--;
            }
        }
        return this;
    };

    function teacher_sort(a, b) {
        return b - a;
    }
    /**
     * 提交运算函数到 document 的 fx 队列
     */
    var submit = function (fun) {
        //debugger;
        var queue = $.queue(document, "fx", fun);
        if (queue[0] == 'inprogress') {
            return;
        }
        $.dequeue(document);
    };
    let maxlabel = 0, minlabel = 9999999;
    function updateTeacherinfoToUI(jqel, tinfo) {
        maxlabel = (tinfo.label > maxlabel) ? tinfo.label : maxlabel;
        minlabel = (tinfo.label < minlabel) ? tinfo.label : minlabel;
        jqel.data("teacherinfo", tinfo);
        jqel.find(".teacher-name")
            .text(jqel.find(".teacher-name").text() + "[" + tinfo.label + "]")
            .text(jqel.find(".teacher-name").text() + "[" + tinfo.thumbupRate + "%]");
        jqel.attr('thumbup', tinfo.thumbup)
            .attr('thumbdown', tinfo.thumbdown)
            .attr('thumbupRate', tinfo.thumbupRate)
            .attr('age', tinfo.age)
            .attr('label', tinfo.label);
    }
    let num = /[0-9]*/g;
    $.each($(".item-top-cont"), function (i, item) {
        item.innerHTML = item.innerHTML.replace('<!--', '').replace('-->', '');
    });

    $(".item").each(function (index, el) {

        submit(function (next) {
            let jqel = $(el);
            let tid = jqel.find(".teacher-details-link a").attr('href').replace("https://www.51talk.com/TeacherNew/info/", "").replace('http://www.51talk.com/TeacherNew/info/', '');
            var tinfokey = 'tinfo-' + tid;
            var tinfo = GM_getValue(tinfokey);
            if (tinfo) {
                updateTeacherinfoToUI(jqel, tinfo);
                next();
                return;
            }
            // ajax 请求一定要包含在一个函数中
            var start = (new Date()).getTime();
            $.ajax({
                url: window.location.protocol + '//www.51talk.com/TeacherNew/teacherComment?tid=' + tid + '&type=bad&has_msg=1',
                type: 'GET',
                dateType: 'html',
                success: function (r) {
                    var jqel = $($(".item")[index]);
                    if ($(".evaluate-content-left span", r) && $(".evaluate-content-left span", r).length >= 3) {
                        var thumbup = Number($(".evaluate-content-left span:eq(1)", r).text().match(num).clean("")[0]);
                        var thumbdown = Number($(".evaluate-content-left span:eq(2)", r).text().match(num).clean("")[0]);
                        var thumbupRate = ((thumbup + 0.00001) / (thumbdown + thumbup)).toFixed(2) * 100;
                        var age = jqel.find(".teacher-age").text().match(num).clean("");
                        var label = (function () {
                            let j_len = jqel.find(".label").text().match(num).clean("").length; let l = 0;
                            for (let j = 0; j < j_len; j++) {
                                l += Number(jqel.find(".label").text().match(num).clean("")[j]);
                            }
                            l = Math.ceil(l / 5);
                            return l;
                        })();;
                        var tinfo = { 'thumbup': thumbup, 'thumbdown': thumbdown, 'thumbupRate': thumbupRate, 'age': age, 'label': label };

                        GM_setValue(tinfokey, tinfo);
                        updateTeacherinfoToUI(jqel, tinfo);
                    } else {
                        console.log('Teacher s detail info getting error:' + JSON.stringify(item) + ",error info:" + r);
                    }
                },
                error: function (data) { console.log("xhr error when getting teacher " + JSON.stringify(item) + ",error msg:" + JSON.stringify(data)); }
            }).always(function () {
                while ((new Date()).getTime() - start < 500) {
                    continue;
                }
                next();
            });
        });
    });

    function executeFilters() {
        var l1 = $("#tlabelslider").slider('values', 0);
        var l2 = $("#tlabelslider").slider('values', 1);

        var rate1 = $("#thumbupRateslider").slider('values', 0);
        var rate2 = $("#thumbupRateslider").slider('values', 1);

        var age1 = $("#tAgeSlider").slider('values', 0);
        var age2 = $("#tAgeSlider").slider('values', 1);

        GM_setValue('filterconfig', { l1, l2, rate1, rate2, age1, age2 });

        let tcount = 0;
        $.each($('.item'), function (i, item) {
            var node = $(item);
            var tinfo = node.data("teacherinfo");

            if (!tinfo) {
                return;
            }
            if ((tinfo.thumbupRate >= rate1 && tinfo.thumbupRate <= rate2) && tinfo.label >= l1 && tinfo.label <= l2 && tinfo.age >= age1 && tinfo.age <= age2) {

                if (node.is(':hidden')) {　　//如果node是隐藏的则显示node元素，否则隐藏
                    node.css('color', 'red').show();
                } else {
                    //nothing todo
                    //node.hide();
                }
                tcount++;
            } else {
                //console.log('teacher info'+JSON.stringify(tinfo))
                //console.log({l1,l2,rate1,rate2,age1,age2});
                node.css('color', 'white').hide();
            }
        });
        $('#tcount').text(tcount);
    }

    submit(function (next) {
        try {
            var config = GM_getValue('filterconfig', { l1: minlabel - 1, l2: maxlabel, rate1: 0, rate2: 100, age1: 0, age2: 110 });

            $('body').append("<div id='filterdialog' title='Teacher Filter'>当前可选教师<span id='tcount'>28</span>位 &nbsp;&nbsp;&nbsp;[<a href='https://github.com/niubilityfrontend/huttingtecaheron51talk/issues/new?assignees=&labels=&template=feature_request.md&title=' target='_blank'>建议新功能</a>]<br />有效经验值 <span id='_tLabelCount' /><br /><div id='tlabelslider'></div>好评率 <span id='_thumbupRate'/><br /><div id='thumbupRateslider'></div>年龄 <span id='_tAge' /><br /><div id='tAgeSlider'></div></div>");
            $('body').append("<div id='wwwww' style='display:none;'></div>"); //这是一个奇怪的BUG on jqueryui. 如果不多额外添加一个，则dialog无法弹出。
            $('#filterdialog').dialog();
            console.log('shown dialog.');
            $("#tlabelslider").slider({
                range: true,
                min: minlabel - 1,
                max: maxlabel,
                values: [config.l1 < minlabel - 1 ? minlabel - 1 : config.l1, config.l2 > maxlabel ? maxlabel : config.l2],
                slide: function (event, ui) {
                    $('#_tLabelCount').html(ui.values[0] + " - " + ui.values[1]);
                },
            }).on('slidestop', function (event, ui) {
                executeFilters();
            });
            $("#thumbupRateslider").slider({
                range: true,
                min: 0,
                max: 100,
                values: [config.rate1, config.rate2],
                slide: function (event, ui) {
                    $('#_thumbupRate').html(ui.values[0] + "% - " + ui.values[1] + '%');
                },
            }).on('slidestop', function (event, ui) {
                executeFilters();
            });
            $("#tAgeSlider").slider({
                range: true,
                min: 0,
                max: 110,
                values: [config.age1, config.age2],
                slide: function (event, ui) {
                    $('#_tAge').html(ui.values[0] + " - " + ui.values[1]);
                },
            }).on("slidestop", function (event, ui) {
                executeFilters();
            });
            var l1 = $("#tlabelslider").slider('values', 0);
            var l2 = $("#tlabelslider").slider('values', 1);

            var rate1 = $("#thumbupRateslider").slider('values', 0);
            var rate2 = $("#thumbupRateslider").slider('values', 1);

            var age1 = $("#tAgeSlider").slider('values', 0);
            var age2 = $("#tAgeSlider").slider('values', 1);

            $('#_tAge').html(age1 + " - " + age2);
            $('#_tLabelCount').html(l1 + " - " + l2);
            $('#_thumbupRate').html(rate1 + "% - " + rate2 + '%');
        } catch (ex) {
            console.log(ex + "");
        }
        executeFilters();
        next();
    });

    submit(function (next) {
        $('.s-t-list').before($(".s-t-page").prop('outerHTML'));
        $('#filterdialog').dialog("open");
        $('#filterdialog').parent().scrollFix();
        next();
    });

})();