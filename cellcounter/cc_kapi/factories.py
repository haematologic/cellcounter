import string
from django.contrib.auth.models import User, AnonymousUser

from cellcounter.main.models import CellType
from .models import Keyboard, KeyMap, DefaultKeyboards

import factory


class UserFactory(factory.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: "test%s" % n)
    first_name = factory.Sequence(lambda n: "test%s" % n)
    last_name = factory.Sequence(lambda n: "test%s" % n)
    email = factory.Sequence(lambda n: "test%s@example.com" % n)
    password = factory.PostGenerationMethodCall('set_password', 'test')

    is_staff = False
    is_active = True
    is_superuser = False

class DefaultKeyboardsFactory(factory.DjangoModelFactory):
    class Meta:
        model = DefaultKeyboards


class DefaultKeyboardFactory(factory.DjangoModelFactory):
    class Meta:
        model = Keyboard
        strategy = factory.BUILD_STRATEGY

    class Params:
        mappings = None

    id = 0
    user = None

    #@factory.post_generation
    #def add_maps(self, create, extracted, **kwargs):
    #    if create:
    #        return
    #    if extracted == False:
    #        return
    #    i = 0
    #    for cell in CellType.objects.all():
    #        mapping = DefaultKeyMapFactory(cellid=cell, key=string.ascii_lowercase[i])
    #        print mapping
    #        self.mappings.add(mapping)
    #        i = i+1

class DefaultKeyMapFactory(factory.DjangoModelFactory):
    class Meta:
        model = KeyMap
        strategy = factory.BUILD_STRATEGY

    key = 'a'

class KeyboardFactory(factory.DjangoModelFactory):
    class Meta:
        model = Keyboard

    user = factory.SubFactory(UserFactory)
    label = 'Test'

    @factory.post_generation
    def add_maps(self, create, extracted, **kwargs):
        if not create:
            return
        if not extracted:
            return
        i = 0
        for cell in CellType.objects.all():
            mapping, created = models.KeyMap.objects.get_or_create(
                cellid=cell, key=string.ascii_lowercase[i])
            self.mappings.add(mapping)
            i += 1

        self.save()


class KeyMapFactory(factory.DjangoModelFactory):
    class Meta:
        model = KeyMap

    key = 'a'
