import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageLoadingOverlay } from "./PageLoadingOverlay";

const meta = {
  component: PageLoadingOverlay,
  decorators: [
    (Story) => (
      <div style={{ position: "relative", width: 480, height: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageLoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CustomText: Story = { args: { text: "Sincronizando treinos..." } };
