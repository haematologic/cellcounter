
QUnit.begin = function() {
    console.log('####');
};

QUnit.testStart = function(test) {
    var module = test.module ? test.module : '';
    console.log('#' + module + " " + test.name + ": started.");
};

QUnit.testDone = function(test) {
    var module = test.module ? test.module : '';
    console.log('#' + module + " " + test.name + ": done.");
    console.log('####');
};

