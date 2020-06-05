const assert = require('assert');
const React = require('react');
const parse = require('..');
const { data, render } = require('./helpers/');

describe('HTML to React', () => {
  describe('exports', () => {
    it('has default ES Module', () => {
      assert.strictEqual(parse.default, parse);
    });

    it('has domToReact', () => {
      assert.strictEqual(parse.domToReact, require('../lib/dom-to-react'));
    });

    it('has htmlToDOM', () => {
      assert.strictEqual(parse.htmlToDOM, require('html-dom-parser'));
    });
  });

  describe('parser', () => {
    [undefined, null, {}, [], 42].forEach(value => {
      it(`throws an error if first argument is ${value}`, () => {
        assert.throws(() => {
          parse(value);
        }, TypeError);
      });
    });

    it('converts empty string to empty array', () => {
      assert.deepEqual(parse(''), []);
    });

    it('returns string if it cannot be parsed as HTML', () => {
      assert.strictEqual(parse('foo'), 'foo');
    });

    it('converts single HTML element to React', () => {
      const html = data.html.single;
      const reactElement = parse(html);
      assert.strictEqual(render(reactElement), html);
    });

    it('converts single HTML element and ignores comment', () => {
      const html = data.html.single;
      // comment should be ignored
      const reactElement = parse(html + data.html.comment);
      assert.strictEqual(render(reactElement), html);
    });

    it('converts multiple HTML elements to React', () => {
      const html = data.html.multiple;
      const reactElements = parse(html);
      assert.strictEqual(
        render(React.createElement('div', {}, reactElements)),
        '<div>' + html + '</div>'
      );
    });

    it('converts complex HTML to React', () => {
      const html = data.html.complex;
      const reactElement = parse(data.html.doctype + html);
      assert.strictEqual(render(reactElement), html);
    });

    it('converts empty <script> to React', () => {
      const html = '<script></script>';
      const reactElement = parse(html);
      assert.strictEqual(render(reactElement), html);
    });

    it('converts empty <style> to React', () => {
      const html = '<style></style>';
      const reactElement = parse(html);
      assert.strictEqual(render(reactElement), html);
    });

    it('converts SVG to React', () => {
      const svg = data.svg.complex;
      const reactElement = parse(svg);
      assert.strictEqual(render(reactElement), svg);
    });

    it('decodes HTML entities', () => {
      const encodedEntities = 'asdf &amp; &yuml; &uuml; &apos;';
      const decodedEntities = "asdf & ÿ ü '";
      const reactElement = parse('<i>' + encodedEntities + '</i>');
      assert.strictEqual(reactElement.props.children, decodedEntities);
    });
  });

  describe('options', () => {
    describe('replace', () => {
      it('overrides the element if a valid React element is returned', () => {
        const html = data.html.complex;
        const reactElement = parse(html, {
          replace: node => {
            if (node.name === 'title') {
              return React.createElement('title', {}, 'Replaced Title');
            }
          }
        });
        assert.strictEqual(
          render(reactElement),
          html.replace('<title>Title</title>', '<title>Replaced Title</title>')
        );
      });

      it('does not override the element if an invalid React element is returned', () => {
        const html = data.html.complex;
        const reactElement = parse(html, {
          replace: node => {
            if (node.attribs && node.attribs.id === 'header') {
              return {
                type: 'h1',
                props: { children: 'Heading' }
              };
            }
          }
        });
        assert.notEqual(
          render(reactElement),
          html.replace(
            '<header id="header">Header</header>',
            '<h1>Heading</h1>'
          )
        );
      });
    });

    describe('library', () => {
      it('converts with Preact instead of React', () => {
        const Preact = require('preact');
        const html = data.html.single;
        const options = { library: Preact };
        const preactElement = parse(html, options);
        assert.deepEqual(preactElement, Preact.createElement('p', {}, 'foo'));
      });
    });

    describe('htmlparser2', () => {
      it('parses XHTML with xmlMode enabled', () => {
        // using self-closing syntax (`/>`) for non-void elements is invalid
        // which causes elements to nest instead of being rendered correctly
        // enabling htmlparser2 option xmlMode resolves this issue
        const html = '<ul><li/><li/></ul>';
        const options = { htmlparser2: { xmlMode: true } };
        const reactElements = parse(html, options);
        assert.strictEqual(
          render(reactElements),
          '<ul><li></li><li></li></ul>'
        );
      });
    });

    describe('trim', () => {
      it('preserves whitespace text nodes when disabled (default)', () => {
        const html = `<table>
  <tbody>
  </tbody>
</table>`;
        const reactElement = parse(html);
        assert.strictEqual(render(reactElement), html);
      });

      it('removes whitespace text nodes when enabled', () => {
        const html = `<table>
      <tbody><tr><td> text </td><td> </td>\t</tr>\r</tbody>\n</table>`;
        const options = { trim: true };
        const reactElement = parse(html, options);
        assert.strictEqual(
          render(reactElement),
          '<table><tbody><tr><td> text </td><td></td></tr></tbody></table>'
        );
      });
    });
  });
});
