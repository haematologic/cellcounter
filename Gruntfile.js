/*global module:false*/
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        qunit: {
            'cellcounter': ['tests/index.html']
        }
    });

    // Load plugin
    grunt.loadNpmTasks('grunt-contrib-qunit');

    // Travis CI task.
    grunt.registerTask('test', 'qunit:cellcounter');
};
