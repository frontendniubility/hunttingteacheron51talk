
// ==UserScript==
// @name         辅助选老师-有效经验值|好评率|年龄|Top 5
// @version      0.1.26
// @namespace    https://github.com/niubilityfrontend
// @description  51Talk.辅助选老师-有效经验值|好评率|年龄|Top 5；有效经验值=所有标签数量相加后除以5；好评率=好评数/总评论数；年龄根据你的喜好选择。
// @author       jimbo
// @license      GPLv3
// @supportURL   https://github.com/niubilityfrontend/hunttingteacheron51talk
// @match        https://www.51talk.com/ReserveNew/index*
// @match        http://www.51talk.com/ReserveNew/index*
// @icon         https://avatars3.githubusercontent.com/u/25388328
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/pace/1.0.2/pace.min.js
// @require      https://greasyfork.org/scripts/388372-scrollfix/code/scrollfix.js?version=726657
// ==/UserScript==
(function () {
    'use strict';
    Pace.Options = {
        ajax: false, // disabled
        document: false, // disabled
        eventLag: false, // disabled
        elements: {
            selectors: ['#filterdialog']
        }
    };
    $("head").append(
        '<link '
        + 'href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" '
        + 'rel="stylesheet" type="text/css">'
    );
    $("head").append('<style type="text/css">'
        + '.search-teachers .s-t-list .item-time-list {margin-top:315px;}'
        + ' .search-teachers .s-t-list .item {   height: 679px; }'
        + '.search-teachers .s-t-list .s-t-content { margin-right: 0px;}'
        + '.search-teachers { width: 100%; }'
        + '.search-teachers .s-t-list .item .item-top .teacher-name {line-height: 15px;}'
        + '.search-teachers .s-t-list .item { height: auto;  margin-right: 5px; margin-bottom: 5px; }'
        + '.pace {'
        + '  -webkit-pointer-events: none;'
        + '  pointer-events: none;'
        + ''
        + '  -webkit-user-select: none;'
        + '  -moz-user-select: none;'
        + '  user-select: none;'
        + '}'
        + ''
        + '.pace-inactive {'
        + '  display: none;'
        + '}'
        + ''
        + '.pace .pace-progress {'
        + '  background: #29d;'
        + '  position: fixed;'
        + '  z-index: 2000;'
        + '  top: 0;'
        + '  right: 100%;'
        + '  width: 100%;'
        + '  height: 2px;'
        + '}'
        + ''
        + '</style>');

    $.each($(".item-top-cont"), function (i, item) {
        item.innerHTML = item.innerHTML.replace('<!--', '').replace('-->', '');
    });
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
    Number.prototype.toString = function () {
        return this.toFixed(2);
    };
    String.prototype.toFloat = function () {
        return parseFloat(this);
    };
    String.prototype.toInt = function () {
        return parseint(this);
    };

    String.prototype.startsWith = function (str) {
        return this.slice(0, str.length) == str;
    };
    String.prototype.endsWith = function (str) {
        return this.slice(-str.length) == str;
    };
    String.prototype.contains = function (str) {
        return this.indexOf(str) > -1;
    };
    var asc = function (a, b) {
        return $(a).attr('indicator').toFloat() > $(b).attr('indicator').toFloat() ? 1 : -1;
    };

    var desc = function (a, b) {
        return $(a).attr('indicator').toFloat() > $(b).attr('indicator').toFloat() ? -1 : 1;
    };

    var sortByIndicator = function (sortBy) {
        var sortEle = $('.s-t-content.f-cb .item').sort(sortBy);
        $('.s-t-content.f-cb').empty().append(sortEle);
    };
    /**
     * 提交运算函数到 document 的 fx 队列
     */
    var submit = function (fun) {
        var queue = $.queue(document, "fx", fun);
        if (queue[0] == 'inprogress') {
            return;
        }
        $.dequeue(document);
    };
    let maxlabel = 0, minlabel = 9999999, maxfc = 0, minfc = 999999;
    function updateTeacherinfoToUI(jqel, tinfo) {
        maxlabel = (tinfo.label > maxlabel) ? tinfo.label : maxlabel;
        minlabel = (tinfo.label < minlabel) ? tinfo.label : minlabel;
        maxfc = (tinfo.favoritesCount > maxfc) ? tinfo.favoritesCount : maxfc;
        minfc = (tinfo.favoritesCount < minfc) ? tinfo.favoritesCount : minfc;
        jqel.attr("teacherinfo", JSON.stringify(tinfo));
        jqel.find(".teacher-name")
            .html(jqel.find(".teacher-name").text() + "<br />[" + tinfo.label + "x" + tinfo.thumbupRate + "%=" + tinfo.indicator / 100 + "]");
        jqel.find(".teacher-age")
            .html(jqel.find(".teacher-age").text() + " | <label title='被收藏数'>" + tinfo.favoritesCount + "</label>");

        jqel//.attr('thumbup', tinfo.thumbup)
            //.attr('thumbdown', tinfo.thumbdown)
            //.attr('thumbupRate', tinfo.thumbupRate)
            //.attr('age', tinfo.age)
            //.attr('label', tinfo.label)
            .attr('indicator', tinfo.indicator);

    }
    function executeFilters(uifilters) {
        let tcount = 0, hidecount = 0;
        $.each($('.item'), function (i, item) {
            var node = $(item);
            var tinfojson = node.attr("teacherinfo");
            if (!tinfojson) {
                return true;
            }
            var tinfo = JSON.parse(tinfojson);
            if ((tinfo.thumbupRate >= uifilters.rate1 && tinfo.thumbupRate <= uifilters.rate2)
                && tinfo.label >= uifilters.l1 && tinfo.label <= uifilters.l2
                && tinfo.age >= uifilters.age1 && tinfo.age <= uifilters.age2
                && tinfo.favoritesCount >= uifilters.fc1 && tinfo.favoritesCount <= uifilters.fc2) {
                if (node.is(':hidden')) {　　//如果node是隐藏的则显示node元素，否则隐藏
                    node.show();
                    node.animate({
                        left: "+=50"
                    }, 3500).animate({
                        left: "-=50"
                    }, 3500);
                } else {
                    //nothing todo
                }
                tcount++;
            } else {
                node.css('color', 'white').hide();
                hidecount++;
            }
        });
        $('#tcount').text(tcount);
        $('#thidecount').text(hidecount);
    }
    let configExprMilliseconds = 1000 * 60 * 60 * GM_getValue('tinfoexprhours', 12); //缓存12小时
    $(".item").each(function (index, el) {
        submit(function (next) {
            Pace.track(function () {
                let jqel = $(el);
                let tid = jqel.find(".teacher-details-link a").attr('href').replace("https://www.51talk.com/TeacherNew/info/", "").replace('http://www.51talk.com/TeacherNew/info/', '');
                var tinfokey = 'tinfo-' + tid;
                var tinfoexpirekey = 'tinfoexpire-' + tid;
                var tinfoexpire = GM_getValue(tinfoexpirekey, new Date().getTime());
                if (new Date().getTime() - tinfoexpire < configExprMilliseconds) {
                    var tinfo = GM_getValue(tinfokey);
                    if (tinfo) {
                        updateTeacherinfoToUI(jqel, tinfo);
                        next();
                        return true;
                    }
                }
                // ajax 请求一定要包含在一个函数中
                var start = (new Date()).getTime();
                let num = /[0-9]*/g;
                $.ajax({
                    url: window.location.protocol + '//www.51talk.com/TeacherNew/teacherComment?tid=' + tid + '&type=bad&has_msg=1',
                    type: 'GET',
                    dateType: 'html',
                    success: function (r) {
                        if ($(".evaluate-content-left span", r) && $(".evaluate-content-left span", r).length >= 3) {
                            var thumbup = Number($(".evaluate-content-left span:eq(1)", r).text().match(num).clean("")[0]);
                            var thumbdown = Number($(".evaluate-content-left span:eq(2)", r).text().match(num).clean("")[0]);
                            var thumbupRate = ((thumbup + 0.00001) / (thumbdown + thumbup)).toFixed(2) * 100;
                            var favoritesCount = Number($(".clear-search", r).text().match(num).clean("")[0]);
                            var age = jqel.find(".teacher-age").text().match(num).clean("")[0];
                            var label = (function () {
                                let j_len = jqel.find(".label").text().match(num).clean("").length; let l = 0;
                                for (let j = 0; j < j_len; j++) {
                                    l += Number(jqel.find(".label").text().match(num).clean("")[j]);
                                }
                                l = Math.ceil(l / 5);
                                return l;
                            })();
                            var tinfo = { 'thumbup': thumbup, 'thumbdown': thumbdown, 'thumbupRate': thumbupRate, 'age': age, 'label': label, 'indicator': label * thumbupRate, 'favoritesCount': favoritesCount };
                            GM_setValue(tinfoexpirekey, new Date().getTime());
                            GM_setValue(tinfokey, tinfo);
                            updateTeacherinfoToUI(jqel, tinfo);
                        } else {
                            console.log('Teacher s detail info getting error:' + JSON.stringify(jqel) + ",error info:" + r);
                        }
                    },
                    error: function (data) { console.log("xhr error when getting teacher " + JSON.stringify(jqel) + ",error msg:" + JSON.stringify(data)); }
                }).always(function () {
                    while ((new Date()).getTime() - start < 600) {
                        continue;
                    }
                    next();
                });

            });
        });
    });
    function getUiFilters() {
        var l1 = $("#tlabelslider").slider('values', 0);
        var l2 = $("#tlabelslider").slider('values', 1);
        var rate1 = $("#thumbupRateslider").slider('values', 0);
        var rate2 = $("#thumbupRateslider").slider('values', 1);
        var age1 = $("#tAgeSlider").slider('values', 0);
        var age2 = $("#tAgeSlider").slider('values', 1);
        var fc1 = $("#fcSlider").slider('values', 0);
        var fc2 = $("#fcSlider").slider('values', 1);
        return { l1, l2, rate1, rate2, age1, age2, fc1, fc2 };
    }
    submit(function (next) {
        try {
            var config = GM_getValue('filterconfig', { l1: 300, l2: maxlabel, rate1: 96, rate2: 100, age1: 0, age2: 110 });
            $('body').append("<div id='filterdialog' title='Teacher Filter'>"
                + "当前可选<span id='tcount' />位,被折叠<span id='thidecount' />位。 "
                + "<div id='buttons'><button id='asc' title='当前为降序，点击后按升序排列'>升序</button><button id='desc' title='当前为升序，点击进行降序排列'  style='display:none;'>降序</button>&nbsp;<input id='tinfoexprhours' title='缓存过期时间（小时）'>&nbsp;<button title='清空教师信息缓存，并重新搜索'>清除缓存</button>&nbsp;<a>去提建议和BUG</a>&nbsp;<a>?</a>&nbsp;</div>"
                + "<br />有效经验值 <span id='_tLabelCount' /><br /><div id='tlabelslider'></div>"
                + "收藏数 <span id='_tfc' /><br /><div id='fcSlider'></div>"
                + "好评率 <span id='_thumbupRate'/><br /><div id='thumbupRateslider'></div>"
                + "年龄 <span id='_tAge' /><br /><div id='tAgeSlider'></div>"
                + "</div>");
            $('body').append("<div id='wwwww'>已加载选课辅助插件。</div>"); //这是一个奇怪的BUG on jqueryui. 如果不多额外添加一个，则dialog无法弹出。
            $("#tlabelslider").slider({
                range: true,
                min: minlabel - 1,
                max: maxlabel,
                values: [config.l1 < minlabel - 1 ? minlabel - 1 : config.l1, maxlabel],
                slide: function (event, ui) {
                    $('#_tLabelCount').html(ui.values[0] + " - " + ui.values[1]);
                },
            }).on('slidestop', function (event, ui) {
                var l1 = $("#tlabelslider").slider('values', 0);
                var l2 = $("#tlabelslider").slider('values', 1);
                var uifilters = getUiFilters();
                var filterconfig = GM_getValue('filterconfig', uifilters);
                filterconfig.l1 = l1;
                filterconfig.l2 = l2;
                GM_setValue('filterconfig', filterconfig);
                executeFilters(uifilters);
            });
            {//配置信息兼容处理 0.1.25 增加收藏次数
                var filterconfig = GM_getValue('filterconfig');
                if (filterconfig && (!filterconfig.fc1 || !filterconfig.fc2)) {
                    filterconfig.fc1 = minfc;
                    filterconfig.fc2 = maxfc;
                    GM_setValue('filterconfig', filterconfig);
                }
            }
            $("#fcSlider").slider({
                range: true,
                min: minfc,
                max: maxfc,
                values: [config.fc1 < minfc ? minfc : config.fc1, maxfc],
                slide: function (event, ui) {
                    $('#_tfc').html(ui.values[0] + " - " + ui.values[1]);
                },
            }).on('slidestop', function (event, ui) {
                var fc1 = $("#fcSlider").slider('values', 0);
                var fc2 = $("#fcSlider").slider('values', 1);
                var uifilters = getUiFilters();
                var filterconfig = GM_getValue('filterconfig', uifilters);
                filterconfig.fc1 = fc1;
                filterconfig.fc2 = fc2;
                GM_setValue('filterconfig', filterconfig);
                executeFilters(uifilters);
            });
            $("#thumbupRateslider").slider({
                range: true,
                min: 0,
                max: 100,
                values: [config.rate1, 100],
                slide: function (event, ui) {
                    $('#_thumbupRate').html(ui.values[0] + "% - " + ui.values[1] + '%');
                },
            }).on('slidestop', function (event, ui) {
                var rate1 = $("#thumbupRateslider").slider('values', 0);
                var rate2 = $("#thumbupRateslider").slider('values', 1);
                var uifilters = getUiFilters();
                var filterconfig = GM_getValue('filterconfig', uifilters);
                filterconfig.rate1 = rate1;
                filterconfig.rate2 = rate2;
                GM_setValue('filterconfig', filterconfig);
                executeFilters(uifilters);
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
                var age1 = $("#tAgeSlider").slider('values', 0);
                var age2 = $("#tAgeSlider").slider('values', 1);
                var uifilters = getUiFilters();
                var filterconfig = GM_getValue('filterconfig', uifilters);
                filterconfig.age1 = age1;
                filterconfig.age2 = age2;
                GM_setValue('filterconfig', filterconfig);
                executeFilters(uifilters);
            });

            $('#buttons button,#buttons input,#buttons a').eq(0).button({ icon: 'ui-icon-arrowthick-1-n', showLabel: false })//升序
                .click(function () {
                    $('#desc').show();
                    $(this).hide();
                    sortByIndicator(asc);
                }).end().eq(1).button({ icon: 'ui-icon-arrowthick-1-s', showLabel: false })//降序
                .click(function () {
                    $('#asc').show();
                    $(this).hide();
                    sortByIndicator(desc);
                }).end().eq(2).spinner({
                    min: 0,
                    spin: function (event, ui) {
                        GM_setValue('tinfoexprhours', ui.value)
                    }
                })// 缓存过期时间（小时）
                .css({ width: '20px' })
                .val(GM_getValue('tinfoexprhours', 12))
                .end().eq(3).button({ icon: 'ui-icon-trash', showLabel: false })//清空缓存
                .click(function () {
                    $.each(GM_listValues(), function (i, item) {
                        if (item.startsWith('tinfo-')) {
                            GM_deleteValue(item);
                        }
                    });
                    $('.go-search').click();
                }).end().eq(4).button({ icon: 'ui-icon-comment', showLabel: false })//submit suggestion
                .prop('href', 'https://github.com/niubilityfrontend/hunttingteacheron51talk/issues/new?assignees=&labels=&template=feature_request.md&title=')
                .prop('target', '_blank')
                .end().eq(5).button({ icon: 'ui-icon-help', showLabel: false })//系统帮助
                .prop('href', 'https://github.com/niubilityfrontend/hunttingteacheron51talk/blob/master/README.md')
                .prop('target', '_blank');

            var uifilters = getUiFilters();
            executeFilters(uifilters);
            $('#_tAge').html(uifilters.age1 + " - " + uifilters.age2);
            $('#_tLabelCount').html(uifilters.l1 + " - " + uifilters.l2);
            $('#_thumbupRate').html(uifilters.rate1 + "% - " + uifilters.rate2 + '%');
            $('#_tfc').html(uifilters.fc1 + " - " + uifilters.fc2 + '');
        } catch (ex) {
            console.log(ex + "");
        }
        next();
    });
    submit(function (next) {
        $('.s-t-list').before($(".s-t-page").prop('outerHTML'));
        sortByIndicator(desc);
        $('#filterdialog').dialog({ 'width': '360px' });
        $('#filterdialog').parent().scrollFix();
        $('#filterdialog').dialog("open");
        next();
    });
})();