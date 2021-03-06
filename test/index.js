import isBrowser from '../lib/util/is-browser';
import Registry from '..';

function _setupBaseAndTabularRegistryMocks(registryUrl) {
  const registry = (
    'id,title,schema,specification,schema_path\n' +
    'base,Data Package,http://example.com/baseProfile.json,http://example.com,baseProfile.json\n' +
    'tabular,Tabular Data Package,http://example.com/tabular_profile.json,http://example.com,tabular_profile.json\n'
  );
  const profiles = {
    base: '{"title": "base"}',
    tabular: '{"title": "tabular"}',
  };

  fetchMock.mock(registryUrl, registry);
  fetchMock.mock('http://example.com/baseProfile.json', profiles.base);
  fetchMock.mock('http://example.com/tabular_profile.json', profiles.tabular);
}

describe('Data Package Registry', () => {
  const DEFAULT_REGISTRY_URL = 'http://schemas.datapackages.org/registry.csv';

  afterEach(() => {
    fetchMock.restore();
  });

  describe('#get', () => {
    beforeEach(() => {
      _setupBaseAndTabularRegistryMocks(DEFAULT_REGISTRY_URL);
    });

    it('returns undefined if profileId is inexistent', () => {
      const registry = new Registry(DEFAULT_REGISTRY_URL);
      return registry.get('inexistent-profile-id').should.eventually.be.undefined;
    });

    it('returns the profile by its ID', () => {
      const baseProfile = { title: 'base' };
      const registry = new Registry(DEFAULT_REGISTRY_URL);
      return registry.get('base').should.eventually.be.deep.equal(baseProfile);
    });
  });

  describe('#getProfiles', () => {
    it('resolve into non-empty object when registry is not empty', () => {
      fetchMock.mock(DEFAULT_REGISTRY_URL, 'id,title,schema,specification\n1,2,3,4');

      const registry = new Registry(DEFAULT_REGISTRY_URL);

      return registry.getProfiles().should.eventually.be.not.empty;
    });

    it('resolve into empty object when registry is empty', () => {
      fetchMock.mock(DEFAULT_REGISTRY_URL, 'id,title,schema,specification');

      const registry = new Registry(DEFAULT_REGISTRY_URL);

      return registry.getProfiles().should.eventually.be.empty;
    });

    it('has the profiles mapped by their ids', () => {
      fetchMock.mock(DEFAULT_REGISTRY_URL, 'id,title,schema,specification\n1,2,3,4');

      const registry = new Registry(DEFAULT_REGISTRY_URL);

      return registry.getProfiles()
               .then((profiles) => {
                 profiles.should.include.key('1');
               });
    });

    it('reject when connection fails', () => {
      fetchMock.mock(DEFAULT_REGISTRY_URL, 500);

      const registry = new Registry(DEFAULT_REGISTRY_URL);

      return registry.getProfiles().should.eventually.be.rejected;
    });

    it('caches the registry after the first load', () => {
      fetchMock.mock(DEFAULT_REGISTRY_URL, 'id,title,schema,specification\n1,2,3,4');

      const registry = new Registry(DEFAULT_REGISTRY_URL);

      return registry.getProfiles()
               .then(() => {
                 fetchMock.restore();
                 fetchMock.mock(DEFAULT_REGISTRY_URL, 500);

                 return registry.getProfiles().should.eventually.be.fulfilled;
               });
    });
  });

  if (isBrowser) {
    describe('in browser', () => {
      describe('#getProfiles', () => {
        it('uses the default remote registry by default', () => {
          fetchMock.mock(DEFAULT_REGISTRY_URL, 'id,title,schema,specification\n1,2,3,4');
          const registry = new Registry();

          return registry.getProfiles()
                   .then(() => {
                     fetchMock.called(DEFAULT_REGISTRY_URL).should.be.true;
                   });
        });
      });
    });
  } else {
    describe('in NodeJS', () => {
      describe('#get', () => {
        it('prefers loading the local copies of the profiles', () => {
          fetchMock.mock('.*', 500);
          const registryPath = fixturePath('base_and_tabular_registry.csv');
          const registry = new Registry(registryPath);

          return registry.get('base').should.eventually.exist;
        });
      });

      describe('#getProfiles', () => {
        it('uses the local cache by default', () => {
          fetchMock.mock('.*', 500);
          const registry = new Registry();

          return registry.getProfiles().should.eventually.be.not.empty;
        });

        it('accepts a local registry', () => {
          const registryPath = fixturePath('base_and_tabular_registry.csv');
          const registry = new Registry(registryPath);

          return registry.getProfiles().should.eventually.be.not.empty;
        });
      });
    });
  }
});
