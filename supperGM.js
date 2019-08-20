// ==UserScript==
// @name            Super_GM
// @description     Extends the GM_setValue and GM_getValue functions for any javascript variable type. basis on https://userscripts-mirror.org/scripts/source/107941.user.js 
// @namespace       userscripts.org/users/158640
// ==/UserScript==

if(! String.prototype.startsWith)
String.prototype.startsWith = function (str) {
    return this.slice(0, str.length) == str;
};
if(!String.prototype.endsWith )
String.prototype.endsWith = function (str) {
    return this.slice(-str.length) == str;
};
if(!String.prototype.contains)
String.prototype.contains = function (str) {
    return this.indexOf(str) > -1;
};
var SuperGM = function (version, _expiredMilliseconds) {
    var versionkeybasic = 'tsharp.org:key:v:';
    var expiredkeybasic = 'tsharp.org:key:e:';
    var JSON_MarkerStr = 'json_val: ';
    var FunctionMarker = 'function_code: ';
    var expiredMilliseconds = -1;
    if (typeof version != 'undefine') version = -1;
    if (typeof _expiredMilliseconds != 'undefine')
        expiredMilliseconds = -1;
    else
        expiredMilliseconds = _expiredMilliseconds;
    function ReportError(msg) {
        if (console && console.error)
            console.log(msg);
        else
            throw new Error(msg);
    }

    //--- Check that the environment is proper.
    if (typeof GM_setValue != "function")
        ReportError('This library requires Greasemonkey! GM_setValue is missing.');
    if (typeof GM_getValue != "function")
        ReportError('This library requires Greasemonkey! GM_getValue is missing.');
    if (typeof version != 'integer') {
        ReportError('version should be a integer type if you wana set it.');
    }
    if (typeof expiredMilliseconds != 'integer') {
        ReportError('expiredMilliseconds should be a integer type if you wana set it.');
    }

    /*--- set ()
        GM_setValue (http://wiki.greasespot.net/GM_setValue) only stores:
        strings, booleans, and integers (a limitation of using Firefox
        preferences for storage).

        This function extends that to allow storing any data type.

        Parameters:
            varName
                String: The unique (within this script) name for this value.
                Should be restricted to valid Javascript identifier characters.
            varValue
                Any valid javascript value.  Just note that it is not advisable to
                store too much data in the Firefox preferences.

        Returns:
            undefined
    */
    this.set = function (varName, varValue) {

        if (!varName) {
            ReportError('Illegal varName sent to GM_SuperValue.set().');
            return;
        }
        if (/[^\w _-]/.test(varName)) {
            ReportError('Suspect, probably illegal, varName sent to GM_SuperValue.set().');
        }
        var versionKey = versionkeybasic + varName;
        GM_setValue(versionKey, version);
        var expiredkey = expiredkeybasic + varName;
        GM_setValue(expiredkey, new Date().getTime());
        switch (typeof varValue) {
            case 'undefined':
                ReportError('Illegal varValue sent to GM_SuperValue.set().');
                break;
            case 'boolean':
            case 'string':
                //--- These 2 types are safe to store, as is.
                GM_setValue(varName, varValue);
                break;
            case 'number':
                /*--- Numbers are ONLY safe if they are integers.
                    Note that hex numbers, EG 0xA9, get converted
                    and stored as decimals, EG 169, automatically.
                    That's a feature of JavaScript.

                    Also, only a 32-bit, signed integer is allowed.
                    So we only process +/-2147483647 here.
                */
                if (varValue === parseInt(varValue) && Math.abs(varValue) < 2147483647) {
                    GM_setValue(varName, varValue);
                    break;
                }
            case 'object':
                /*--- For all other cases (but functions), and for
                    unsafe numbers, store the value as a JSON string.
                */
                var safeStr = JSON_MarkerStr + JSON.stringify(varValue);
                GM_setValue(varName, safeStr);
                break;
            case 'function':
                /*--- Functions need special handling.
                */
                var safeStr = FunctionMarker + varValue.toString();
                GM_setValue(varName, safeStr);
                break;

            default:
                ReportError('Unknown type in GM_SuperValue.set()!');
                break;
        }
    }//-- End of set()


    /*--- get ()
        GM_getValue (http://wiki.greasespot.net/GM_getValue) only retieves:
        strings, booleans, and integers (a limitation of using Firefox
        preferences for storage).

        This function extends that to allow retrieving any data type -- as
        long as it was stored with GM_SuperValue.set().

        Parameters:
            varName
                String: The property name to get. See GM_SuperValue.set for details.
            defaultValue
                Optional. Any value to be returned, when no value has previously
                been set.

        Returns:
            When this name has been set...
                The variable or function value as previously set.

            When this name has not been set, and a default is provided...
                The value passed in as a default

            When this name has not been set, and default is not provided...
                undefined
    */
    this.get = function (varName, defaultValue) {

        if (!varName) {
            ReportError('Illegal varName sent to GM_SuperValue.get().');
            return;
        }
        if (/[^\w _-]/.test(varName)) {
            ReportError('Suspect, probably illegal, varName sent to GM_SuperValue.get().');
        }
        var versionKey = versionkeybasic + varName;
        var savedversion = GM_getValue(versionKey);
        if (version != savedversion) {  //需判断设置默认-1时
            if (typeof GM_deleteValue != "function") {
                GM_deleteValue(varName);
                GM_deleteValue(versionKey);
            }
            if (typeof defaultValue == 'function')
                return defaultValue();
            else
                return defaultValue;
        }
        var expiredkey = expiredkeybasic + varName;
        var expire = GM_getValue(expiredkey);
        if (new Date().getTime() - expire > expiredMilliseconds) {
            if (typeof GM_deleteValue != "function") {
                GM_deleteValue(varName);
                GM_deleteValue(expiredkey);
            }
        }
        //--- Attempt to get the value from storage.
        var varValue = GM_getValue(varName);
        if (!varValue)
            return defaultValue;

        //--- We got a value from storage. Now unencode it, if necessary.
        if (typeof varValue == "string") {
            //--- Is it a JSON value?
            var regxp = new RegExp('^' + JSON_MarkerStr + '(.+)$');
            var m = varValue.match(regxp);
            if (m && m.length > 1) {
                varValue = JSON.parse(m[1]);
                return varValue;
            }

            //--- Is it a function?
            var regxp = new RegExp('^' + FunctionMarker + '((?:.|\n|\r)+)$');
            var m = varValue.match(regxp);
            if (m && m.length > 1) {
                varValue = eval('(' + m[1] + ')');
                return varValue;
            }
        }

        return varValue;
    }//-- End of get()
}