/* Test global variables exist */

$(document).ready(function() {
QUnit.test( "Keyboard active", function( assert ) {
  assert.ok( keyboard_active == false, "Passed!" );
});
});
