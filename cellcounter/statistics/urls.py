from django.conf.urls import patterns, url

from .views import ListCreateCountInstanceAPI


urlpatterns = patterns('',
                       url('^$', ListCreateCountInstanceAPI.as_view(),
                           name='create-count-instance'),
                       )