import type {Preview} from '@storybook/web-components';
import '../static/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (story) => {
      const style = document.createElement('style');
      style.textContent = `
      @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD@100..700,0..1,-50..200");
      @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap');
      `;
      document.head.appendChild(style);
      return story();
    },
  ],
};

export default preview;
