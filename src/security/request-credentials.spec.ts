import {
  extractBearerToken,
  permissionPath,
  readUserFromToken,
} from './request-credentials';

const jwt = (claims: object) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.firma`;

describe('request-credentials', () => {
  it('extrae solo tokens Bearer', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('bearer   abc')).toBe('abc');
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('Bearer')).toBeNull();
  });

  it('envía la ruta sin query string ni / final', () => {
    expect(
      permissionPath('/gestion-deportiva/teams?search=x&active=true'),
    ).toBe('/gestion-deportiva/teams');
    expect(permissionPath('/gestion-deportiva/teams/5/')).toBe(
      '/gestion-deportiva/teams/5',
    );
    expect(permissionPath('/')).toBe('/');
  });

  it('lee sub y email del JWT', () => {
    expect(readUserFromToken(jwt({ sub: '7', email: 'a@b.co' }))).toEqual({
      id: 7,
      email: 'a@b.co',
    });
    expect(readUserFromToken(jwt({ sub: 'x' }))).toBeNull();
    expect(readUserFromToken('sin-puntos')).toBeNull();
  });
});
