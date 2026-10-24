import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { AppDownload } from "./AppDownload";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/appLinks";

const meta = {
  component: AppDownload,
  args: { email: "bia@example.com", device: "phone" },
} satisfies Meta<typeof AppDownload>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A phone: "Abrir o app" with the email, and both stores right under it (R10a, R10b). */
export const Phone: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Abrir o app" })).toHaveAttribute(
      "href",
      "verticemobile://login?email=bia%40example.com",
    );
    await expect(canvas.getByRole("link", { name: /App Store/ })).toHaveAttribute("href", APP_STORE_URL);
    await expect(canvas.getByRole("link", { name: /Google Play/ })).toHaveAttribute("href", PLAY_STORE_URL);
  },
};

/** A computer: the QR code of the store-picking link, nothing to tap (R10c, R10d). */
export const Computer: Story = {
  args: { device: "computer", downloadUrl: "https://app.vertice.test/baixar-app" },
  play: async ({ canvas }) => {
    const qr = await canvas.findByRole("img", { name: "QR code para baixar o app Vertice" });
    await expect(qr.getAttribute("src")).toMatch(/^data:image\/svg\+xml;utf8,/);
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};
