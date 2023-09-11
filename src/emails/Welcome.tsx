import { Button } from '@react-email/button';
import { Html } from '@react-email/html';

const Email = () => {
  return (
    <Html lang="en" dir="ltr">
      <Button href="https://example.com" style={{ color: '#61dafb' }}>
        Click me
      </Button>
    </Html>
  );
}
export default Email