import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"
import { v4 as uuidv4 } from "uuid"

export function ProductsSkeleton() {
  return (
    <section className="flex flex-col gap-y-8 py-12 h-auto max-[1800px]:max-w-[80vw] w-[100vw] max-w-[1442px] overflow-hidden mx-auto">
      {Array(4)
        .fill(0)
        .map(() => {
          const uuid = uuidv4()
          return (
            <div key={uuid}>
              {/* max-width:768px */}

              <article className="flex tablet:hidden flex-col gap-y-2">
                {/* Image */}
                <Skeleton
                  duration={2}
                  containerClassName="flex w-full"
                  style={{
                    display: "flex",
                    maxWidth: "1800px",
                    width: "100vw",
                    height: "300px",
                  }}
                  baseColor="hsl(0deg 0% 7%)"
                  highlightColor="hsl(0deg 0% 16%)"
                />

                <div className="flex tablet:hidden flex-col gap-y-4">
                  <div className="flex flex-row gap-x-2 justify-between w-full h-full">
                    {/* Ttile */}
                    <Skeleton
                      duration={2}
                      containerClassName="flex w-[80%] h-fit"
                      style={{ display: "flex", height: "42px" }}
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                    {/* Price */}
                    <Skeleton
                      duration={2}
                      containerClassName="flex w-[20%] h-fit"
                      style={{ display: "flex", height: "42px" }}
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                  </div>
                  <div className="flex flex-col gap-y-2 w-full h-full">
                    {/* description */}
                    <Skeleton
                      duration={2}
                      containerClassName="flex w-[60%] mx-auto"
                      style={{ display: "flex", height: "20px" }}
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                    {/* price */}
                    <Skeleton
                      duration={2}
                      containerClassName="flex w-[30%] mx-auto"
                      style={{ display: "flex", height: "20px" }}
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                  </div>
                  <div className="flex flex-row gap-x-2 mx-auto">
                    {/* Green outline + button */}
                    <div className="flex flex-col justify-between">
                      <Skeleton
                        duration={2}
                        containerClassName="flex h-[2px]"
                        style={{ display: "flex", height: "2px" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(118deg 80% 78%)"
                      />
                      <div className="flex flex-row justify-between">
                        <Skeleton
                          duration={1}
                          containerClassName="flex"
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(118deg 80% 78%)"
                        />
                        <Skeleton
                          direction="rtl"
                          duration={1}
                          containerClassName="flex"
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(118deg 80% 78%)"
                        />
                      </div>
                      <Skeleton
                        duration={2}
                        containerClassName="flex w-[50px]"
                        style={{ display: "flex", height: "2px", rotate: "180deg" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(118deg 80% 78%)"
                      />
                    </div>
                    {/* Red outline + button */}
                    <div className="flex flex-col justify-between">
                      <Skeleton
                        duration={2}
                        containerClassName="flex h-[2px]"
                        style={{ display: "flex", height: "2px" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 80% 72%)"
                      />
                      <div className="flex flex-row justify-between">
                        <Skeleton
                          duration={1}
                          containerClassName="flex"
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                        <Skeleton
                          direction="rtl"
                          duration={1}
                          containerClassName="flex"
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                      </div>
                      <Skeleton
                        duration={2}
                        containerClassName="flex w-[50px]"
                        style={{ display: "flex", height: "2px", rotate: "180deg" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 80% 72%)"
                      />
                    </div>
                    {/* Red outline Clear button */}
                    <div className="flex flex-col justify-between">
                      <Skeleton
                        duration={2}
                        containerClassName="flex h-[2px] w-[115px]"
                        style={{ display: "flex", width: "115px", height: "2px" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 80% 72%)"
                      />
                      <div className="flex flex-row justify-between">
                        <Skeleton
                          duration={1}
                          containerClassName="flex"
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                        <Skeleton
                          direction="rtl"
                          duration={1}
                          containerClassName="flex"
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                      </div>
                      <Skeleton
                        duration={2}
                        containerClassName="flex w-[115px]"
                        style={{ display: "flex", width: "115px", height: "2px", rotate: "180deg" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 80% 72%)"
                      />
                    </div>
                  </div>
                </div>
              </article>

              {/* min-width:768px */}

              <div className="hidden tablet:flex flex-row gap-x-2 h-[300px] tablet:h-[175px] laptop:h-[200px] overflow-hidden">
                {/* Image */}
                <Skeleton
                  duration={2}
                  containerClassName="flex w-full tablet:w-[33%] mb-1"
                  style={{
                    display: "flex",
                    maxWidth: "1800px",
                    width: "100vw",
                    height: "300px",
                  }}
                  baseColor="hsl(0deg 0% 7%)"
                  highlightColor="hsl(0deg 0% 16%)"
                />

                <div className="flex-col justify-between w-full h-full hidden tablet:flex">
                  <div className="flex flex-row gap-x-2 justify-between w-full h-full">
                    {/* Title + description (on stock omitted) */}
                    <div className="flex flex-col gap-y-2 w-full">
                      <Skeleton
                        duration={2}
                        containerClassName="flex w-[80%]"
                        style={{ display: "flex", height: "28px" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 0% 16%)"
                      />
                      <Skeleton
                        duration={2}
                        containerClassName="flex w-[30%]"
                        style={{ display: "flex", height: "20px" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 0% 16%)"
                      />
                    </div>
                    {/* Price */}
                    <Skeleton
                      duration={2}
                      containerClassName="flex w-[20%]"
                      style={{ display: "flex", height: "28px" }}
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                  </div>
                  <div className="flex flex-row gap-x-2 justify-between w-full h-full max-h-[50px] mb-1">
                    {/* quantity + subTotal */}
                    <div className="flex flex-col justify-between w-[20%] h-full">
                      <Skeleton
                        duration={2}
                        containerClassName="flex w-full"
                        style={{ display: "flex", height: "20px" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 0% 16%)"
                      />
                      <Skeleton
                        duration={2}
                        containerClassName="flex items-end w-[90%]"
                        style={{ display: "flex", height: "20px" }}
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 0% 16%)"
                      />
                    </div>
                    <div className="flex flex-row gap-x-2">
                      {/* Green outline + button */}
                      <div className="flex flex-col justify-between">
                        <Skeleton
                          duration={2}
                          containerClassName="flex h-[2px]"
                          style={{ display: "flex", height: "2px" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(118deg 80% 78%)"
                        />
                        <div className="flex flex-row justify-between">
                          <Skeleton
                            duration={1}
                            containerClassName="flex"
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(118deg 80% 78%)"
                          />
                          <Skeleton
                            direction="rtl"
                            duration={1}
                            containerClassName="flex"
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(118deg 80% 78%)"
                          />
                        </div>
                        <Skeleton
                          duration={2}
                          containerClassName="flex w-[50px]"
                          style={{ display: "flex", height: "2px", rotate: "180deg" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(118deg 80% 78%)"
                        />
                      </div>
                      {/* Red outline + button */}
                      <div className="flex flex-col justify-between">
                        <Skeleton
                          duration={2}
                          containerClassName="flex h-[2px]"
                          style={{ display: "flex", height: "2px" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                        <div className="flex flex-row justify-between">
                          <Skeleton
                            duration={1}
                            containerClassName="flex"
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(0deg 80% 72%)"
                          />
                          <Skeleton
                            direction="rtl"
                            duration={1}
                            containerClassName="flex"
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(0deg 80% 72%)"
                          />
                        </div>
                        <Skeleton
                          duration={2}
                          containerClassName="flex w-[50px]"
                          style={{ display: "flex", height: "2px", rotate: "180deg" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                      </div>
                      {/* Red outline Clear button */}
                      <div className="flex flex-col justify-between">
                        <Skeleton
                          duration={2}
                          containerClassName="flex h-[2px] w-[115px]"
                          style={{ display: "flex", width: "115px", height: "2px" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                        <div className="flex flex-row justify-between">
                          <Skeleton
                            duration={1}
                            containerClassName="flex"
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(0deg 80% 72%)"
                          />
                          <Skeleton
                            direction="rtl"
                            duration={1}
                            containerClassName="flex"
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(0deg 80% 72%)"
                          />
                        </div>
                        <Skeleton
                          duration={2}
                          containerClassName="flex w-[115px]"
                          style={{ display: "flex", width: "115px", height: "2px", rotate: "180deg" }}
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
    </section>
  )
}
