import { ActionForm } from "@/components/ui/action-form";
import { FileUploader } from "@/components/ui/file-uploader";
import { addListingVideo, deleteListingVideo } from "@/lib/actions/listing-extras";
import { publicFileUrl } from "@/lib/storage";

/** Video dell'annuncio (massimo 3, 50 MB ciascuno). Solo video girati dal venditore. */
export function VideoManager({ listingId, userId, videos }: { listingId: string; userId: string; videos: { id: string; storage_path: string }[] }) {
  const onUploaded = async (path: string, _name: string, size: number) => {
    "use server";
    return addListingVideo(listingId, path, size);
  };
  return (
    <section className="rounded-2xl border border-line bg-white p-5" aria-labelledby="video-t">
      <h2 id="video-t" className="font-bold">Video dell&apos;auto</h2>
      <p className="mb-3 text-sm text-muted">Fino a 3 video (MP4, MOV o WebM, massimo 50 MB): esterni, interni, motore acceso. Pubblica solo video girati da te, senza targhe di altri veicoli né persone riconoscibili.</p>
      {videos.length > 0 && (
        <ul className="mb-3 grid gap-3 sm:grid-cols-3">{videos.map((v) => (
          <li key={v.id} className="flex flex-col gap-1">
            <video src={publicFileUrl("listing-videos", v.storage_path) ?? undefined} controls preload="metadata" className="aspect-video w-full rounded-lg bg-ink" aria-label="Video caricato" />
            <ActionForm action={deleteListingVideo} submitLabel="Elimina" size="sm" variant="ghost" hidden={{ id: v.id, listing_id: listingId }} confirm="Eliminare il video?" />
          </li>))}</ul>
      )}
      {videos.length < 3 && <FileUploader bucket="listing-videos" folder={userId} kind="media" accept="video/mp4,video/quicktime,video/webm" label="Carica un video" onUploaded={onUploaded} max={3 - videos.length} />}
    </section>
  );
}
